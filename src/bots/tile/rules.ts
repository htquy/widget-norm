import { RuleBasedLlmGateway } from "@/adapters/llm/ruleBasedLlmGateway";
import type { ChatTool, LlmGateway, LlmTurnResult } from "@/application/ports";
import { fold as norm } from "@/domain/text";
import type { SurfaceKind } from "./domain/tile";

const generic = new RuleBasedLlmGateway();

interface RuleState {
  surface?: SurfaceKind;
  lastTileIds?: string[];
  selectedTileId?: string;
  areaM2?: number;
  /** Kích thước khách cho — chuyển nguyên cho calculate_quote tự tính (ốp tường cần cả chiều cao) */
  lengthM?: number;
  widthM?: number;
  heightM?: number;
  openingsM2?: number;
  roofPitchDeg?: number;
}

export type Measures = Partial<Pick<RuleState, "areaM2" | "lengthM" | "widthM" | "heightM" | "openingsM2" | "roofPitchDeg">>;

const toNum = (s: string) => Number(s.replace(",", "."));
const NUM = "(\\d+(?:[.,]\\d+)?)";
const TIMES = "(?:x|×|\\*|nhan)";
const re = (src: string) => new RegExp(src);

/** Bỏ kích thước viên gạch ("gạch 60x60", "80x80 cm") để không nhầm với kích thước phòng. */
const stripTileSizes = (t: string) =>
  t.replace(/(gach|vien|kho|size|loai|mau)\s*\d+\s*[x×*]\s*\d+(\s*cm)?/g, " ").replace(/\d+\s*[x×*]\s*\d+\s*cm/g, " ");

/**
 * Đọc kích thước/diện tích từ câu đã bỏ dấu:
 * "4x5", "4m x 5m", "4,5*6", "4 nhân 5", "dài 4 rộng 5", "4x3x2,7" (dài × rộng × cao), "cao 2,7m",
 * "20m2", "cửa 3m2" (trừ cửa), "dốc 30 độ".
 */
export function parseMeasures(text: string): Measures {
  const t = stripTileSizes(text);
  const out: Measures = {};
  const dims = t.match(re(`${NUM}\\s*m?\\s*${TIMES}\\s*${NUM}\\s*m?(?!2)(?:\\s*${TIMES}\\s*${NUM})?`));
  const dai = t.match(re(`dai\\s*${NUM}`));
  const rong = t.match(re(`rong\\s*${NUM}`));
  const cao = t.match(re(`cao\\s*${NUM}`));
  const openings = t.match(re(`(?:cua|tru)[^\\d]{0,12}${NUM}\\s*(?:m2|m²|met vuong)`));
  const pitch = t.match(re(`(?:doc|nghieng)\\s*${NUM}`)) ?? t.match(re(`${NUM}\\s*(?:do\\b|°)`));
  // Diện tích nhưng không phải phần cửa: lấy số m² đầu tiên không nằm trong cụm "cửa ... m²"
  const withoutOpenings = openings ? t.replace(openings[0], " ") : t;
  const area = withoutOpenings.match(re(`${NUM}\\s*(?:m2|m²|met vuong|mv|m vuong)`));

  if (dims) {
    out.lengthM = toNum(dims[1]);
    out.widthM = toNum(dims[2]);
    if (dims[3]) out.heightM = toNum(dims[3]);
  } else if (dai && rong) {
    out.lengthM = toNum(dai[1]);
    out.widthM = toNum(rong[1]);
  } else if (area) {
    out.areaM2 = toNum(area[1]);
  }
  if (cao) out.heightM = toNum(cao[1]);
  if (openings) out.openingsM2 = toNum(openings[1]);
  if (pitch) {
    const deg = toNum(pitch[1]);
    if (deg > 0 && deg < 75) out.roofPitchDeg = deg;
  }
  return out;
}

/** Bề mặt khách nhắc tới trong câu (đã bỏ dấu); mái > sân vườn > tường > sàn. */
export function detectSurface(t: string): SurfaceKind | undefined {
  if (/(ngoi|lop mai|mai nha|mai ngoi|mai thai|mai doc)/.test(t)) return "roof";
  if (/(san vuon|ngoai troi|ban cong|san thuong|loi di|san truoc|san sau|via he|bac tam cap)/.test(t)) return "outdoor";
  if (/\b(tuong|op tuong|op bep|op)\b/.test(t)) return "wall";
  if (/\b(san|lat san|lat nen|nen nha)\b/.test(t)) return "floor";
  return undefined;
}

/**
 * Bot gạch theo luật — dùng khi LLM lỗi/hết hạn mức hoặc chưa có API key.
 * Hiểu được: sàn/tường/sân vườn/mái, phong cách/màu, ngân sách, diện tích hoặc kích thước
 * ("20m2", "4x5", "4m x 5m", "dài 4 rộng 5", ốp tường "cao 2,7m", mái "dốc 30 độ"), chọn mẫu ("mẫu 2").
 * Câu không liên quan tới gạch (chính sách, đặt lịch, gặp nhân viên) → bot luật dùng chung.
 */
export class TileRulesGateway implements LlmGateway {
  readonly id = "rules";

  describe() {
    return { simple: "rules", complex: "rules" };
  }

  async respond(input: {
    system: string;
    history: unknown[];
    user: { text: string };
    tools: ChatTool[];
    tier: "simple" | "complex";
  }): Promise<LlmTurnResult> {
    const { history, user, tools } = input;
    const prev = (history.at(-1) as { state?: RuleState } | undefined)?.state ?? {};
    const state: RuleState = { ...prev };
    const t = norm(user.text);
    const suggest = tools.find((x) => x.name === "suggest_tiles")!;
    const quote = tools.find((x) => x.name === "calculate_quote")!;
    const details = tools.find((x) => x.name === "get_tile_details");
    const sharedSearch = tools.find((x) => x.name === "search_products");
    if (sharedSearch && !prev.selectedTileId && !/(gach|lat|op tuong|ngoi|mai|san vuon|mau\s*\d|m2|m²|met vuong)/.test(t)) {
      const shared = await sharedSearch.run({ query: user.text });
      if (Array.isArray(shared) && shared.length) return generic.respond(input);
    }

    const surface = detectSurface(t);
    if (surface) state.surface = surface;

    const m = parseMeasures(t);
    if (m.areaM2 || m.lengthM) {
      // Số đo mới thay hẳn số đo cũ
      state.areaM2 = m.areaM2;
      state.lengthM = m.lengthM;
      state.widthM = m.widthM;
      state.heightM = m.heightM ?? (m.lengthM ? undefined : state.heightM);
      state.openingsM2 = m.openingsM2;
    } else {
      if (m.heightM) state.heightM = m.heightM;
      if (m.openingsM2) state.openingsM2 = m.openingsM2;
    }
    if (m.roofPitchDeg) state.roofPitchDeg = m.roofPitchDeg;
    const hasArea = !!(state.areaM2 || (state.lengthM && state.widthM));

    const pick = t.match(/mau\s*(?:so\s*)?(\d)/);
    if (pick && state.lastTileIds) state.selectedTileId = state.lastTileIds[Number(pick[1]) - 1] ?? state.selectedTileId;

    const budget = t.match(/(\d+)\s*(k|nghin|ngan)\b/);
    const maxPricePerM2 = budget ? Number(budget[1]) * 1000 : undefined;

    let text: string;
    const wantsTiles =
      /(mau|goi y|tu van|van da|van go|xi mang|terrazzo|gach bong|trang|den|xam|kem|nau|xanh|hien dai|co dien|toi gian|sang trong|ngoi|san vuon|ngoai troi|chong tron|dat nung|granite|gach the)/.test(t);

    // Hỏi chi tiết/đặc tính một mẫu: "mẫu 2 có chống trơn không", "mô tả mẫu 1"
    const asksDetail = /(mo ta|chi tiet|thong tin|dac diem|dac tinh|chat lieu|chong tron|ben khong|dung o dau|dung cho|co tot|nhu the nao|the nao)/.test(t);

    if (asksDetail && details && (pick || state.selectedTileId) && !hasArea) {
      const d = (await details.run({ tileId: state.selectedTileId })) as { name?: string; description?: string; size?: string; price?: string; inStock?: boolean; error?: string };
      text = d.error
        ? 'Em chưa tìm thấy mẫu này, anh/chị chọn lại "mẫu 1", "mẫu 2"... giúp em nhé.'
        : `${d.name} (${d.size}, ${d.price}${d.inStock ? "" : ", tạm hết hàng"}): ${d.description} Anh/chị cho em diện tích để em báo giá nhé?`;
    } else if (state.selectedTileId && hasArea && state.surface === "wall" && !state.areaM2 && !state.heightM) {
      text = "Để tính gạch ốp tường, anh/chị cho em thêm chiều cao cần ốp (VD: cao 2,7 m) và diện tích cửa đi, cửa sổ nếu có (VD: trừ cửa 3 m²) nhé.";
    } else if (state.selectedTileId && hasArea) {
      const q = (await quote.run({
        tileId: state.selectedTileId,
        surface: state.surface,
        areaM2: state.areaM2,
        lengthM: state.areaM2 ? undefined : state.lengthM,
        widthM: state.areaM2 ? undefined : state.widthM,
        heightM: state.areaM2 ? undefined : state.heightM,
        openingsM2: state.openingsM2,
        roofPitchDeg: state.surface === "roof" ? state.roofPitchDeg : undefined,
      })) as { tile?: string; netAreaM2?: number; boxes?: number; unit?: string; wastePercent?: number; total?: string; notes?: string[]; error?: string };
      if (q.error) {
        text = `${q.error}. Anh/chị cho em lại diện tích (VD: 20 m²) hoặc kích thước dài × rộng nhé.`;
      } else {
        const noGlue = state.surface === "roof" && q.unit === "viên";
        text = `Báo giá ${q.tile} cho ${q.netAreaM2} m²: ${q.boxes} ${q.unit ?? "thùng"} (đã cộng ${q.wastePercent}% hao hụt)${noGlue ? "" : ", kèm keo và ron"} — tổng ${q.total}.${q.notes?.length ? ` Lưu ý: ${q.notes.join(" ")}` : ""} Anh/chị để lại tên và số điện thoại để em gửi báo giá chi tiết nhé?`;
      }
      state.selectedTileId = undefined;
    } else if (wantsTiles || (!state.lastTileIds && state.surface)) {
      const words = t.replace(/\b(cho|toi|minh|em|anh|chi|can|muon|xem|gach|mau|lat|op|san|tuong|phong|khach|ngu|tam|bep|vuon|ngoai|troi|mai|lop|nha|ngoi)\b/g, " ");
      const cards = (await suggest.run({ surface: state.surface, query: words.trim() || undefined, maxPricePerM2 })) as { tileId: string; name: string; price: string }[];
      state.lastTileIds = cards.map((c) => c.tileId);
      const ask = state.surface === "roof" ? "diện tích mái (hoặc diện tích mặt bằng và độ dốc)" : state.surface === "wall" ? "kích thước tường (dài × cao)" : "diện tích (VD: 4x5 m)";
      text = cards.length
        ? `Em gợi ý ${cards.length} mẫu phù hợp ở dưới. Anh/chị chọn "mẫu 1", "mẫu 2"... và cho em ${ask} để em báo giá, hoặc bấm "Xem thử trên ảnh phòng" nhé.`
        : "Hiện em chưa tìm thấy mẫu đúng yêu cầu. Anh/chị thử mô tả màu hoặc phong cách khác giúp em nhé.";
    } else if (hasArea && !state.selectedTileId) {
      text = `Em ghi nhận ${state.areaM2 ? `diện tích ${state.areaM2} m²` : `kích thước ${state.lengthM} × ${state.widthM} m`}. Anh/chị thích phong cách nào (vân đá, vân gỗ, xi măng, gạch bông...) để em gợi ý mẫu ạ?`;
    } else if (/(gia|bao gia|bao nhieu)/.test(t)) {
      text = "Anh/chị chọn mẫu và cho em diện tích cần lát (VD: 4x5 m; ốp tường thêm chiều cao; mái ngói thêm độ dốc) để em tính số thùng/viên và báo giá chính xác nhé.";
    } else {
      // Không phải câu về gạch (chính sách, đặt lịch, gặp nhân viên...) → bot luật dùng chung
      const r = await generic.respond(input);
      text = /chưa có thông tin/.test(r.text)
        ? "Anh/chị cần lát sàn, ốp tường, lát sân vườn hay lợp mái, và thích phong cách nào (vân đá, vân gỗ, xi măng, gạch bông)? Em sẽ gợi ý mẫu phù hợp ạ."
        : r.text;
    }

    return { text, history: [...history, { user: user.text, assistant: text, state }] };
  }
}
