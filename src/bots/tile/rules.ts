import { RuleBasedLlmGateway } from "@/adapters/llm/ruleBasedLlmGateway";
import type { ChatTool, LlmGateway, LlmTurnResult } from "@/application/ports";
import { fold as norm } from "@/domain/text";

const generic = new RuleBasedLlmGateway();

interface RuleState {
  surface?: "floor" | "wall";
  lastTileIds?: string[];
  selectedTileId?: string;
  areaM2?: number;
}

/**
 * Bot gạch theo luật — dùng khi LLM lỗi/hết hạn mức hoặc chưa có API key.
 * Hiểu được: sàn/tường, phong cách/màu, ngân sách, diện tích ("20m2", "4x5"), chọn mẫu ("mẫu 2").
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
    const prev =
      (history.at(-1) as { state?: RuleState } | undefined)?.state ?? {};
    const state: RuleState = { ...prev };
    const t = norm(user.text);
    const suggest = tools.find((x) => x.name === "suggest_tiles")!;
    const quote = tools.find((x) => x.name === "calculate_quote")!;
    const details = tools.find((x) => x.name === "get_tile_details");
    const sharedSearch = tools.find((x) => x.name === "search_products");
    if (
      sharedSearch &&
      !prev.selectedTileId &&
      !/(gach|lat|op tuong|mau\s*\d|m2|m²|met vuong)/.test(t)
    ) {
      const shared = await sharedSearch.run({ query: user.text });
      if (Array.isArray(shared) && shared.length) return generic.respond(input);
    }

    if (/\b(san|lat san|lat nen|nen nha)\b/.test(t)) state.surface = "floor";
    if (/\b(tuong|op tuong|op)\b/.test(t)) state.surface = "wall";

    const dims = t.match(
      /(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)\s*m?\b/,
    );
    const area = t.match(/(\d+(?:[.,]\d+)?)\s*(m2|m²|met vuong|mv)/);
    if (dims)
      state.areaM2 =
        Number(dims[1].replace(",", ".")) * Number(dims[2].replace(",", "."));
    else if (area) state.areaM2 = Number(area[1].replace(",", "."));

    const pick = t.match(/mau\s*(?:so\s*)?(\d)/);
    if (pick && state.lastTileIds)
      state.selectedTileId =
        state.lastTileIds[Number(pick[1]) - 1] ?? state.selectedTileId;

    const budget = t.match(/(\d+)\s*(k|nghin|ngan)/);
    const maxPricePerM2 = budget ? Number(budget[1]) * 1000 : undefined;

    let text: string;
    const wantsTiles =
      /(mau|goi y|tu van|van da|van go|xi mang|terrazzo|gach bong|trang|den|xam|kem|nau|xanh|hien dai|co dien|toi gian|sang trong)/.test(
        t,
      );

    // Hỏi chi tiết/đặc tính một mẫu: "mẫu 2 có chống trơn không", "mô tả mẫu 1"
    const asksDetail =
      /(mo ta|chi tiet|thong tin|dac diem|dac tinh|chat lieu|chong tron|ben khong|dung o dau|dung cho|co tot|nhu the nao|the nao)/.test(
        t,
      );

    if (
      asksDetail &&
      details &&
      (pick || state.selectedTileId) &&
      !state.areaM2
    ) {
      const d = (await details.run({ tileId: state.selectedTileId })) as {
        name?: string;
        description?: string;
        size?: string;
        price?: string;
        inStock?: boolean;
        error?: string;
      };
      text = d.error
        ? 'Em chưa tìm thấy mẫu này, anh/chị chọn lại "mẫu 1", "mẫu 2"... giúp em nhé.'
        : `${d.name} (${d.size}, ${d.price}${d.inStock ? "" : ", tạm hết hàng"}): ${d.description} Anh/chị cho em diện tích để em báo giá nhé?`;
    } else if (state.selectedTileId && state.areaM2) {
      const q = (await quote.run({
        tileId: state.selectedTileId,
        areaM2: state.areaM2,
      })) as {
        tile: string;
        boxes: number;
        wastePercent: number;
        total: string;
      };
      text = `Báo giá ${q.tile} cho ${state.areaM2} m²: ${q.boxes} thùng (đã cộng ${q.wastePercent}% hao hụt), kèm keo và ron — tổng ${q.total}. Anh/chị để lại tên và số điện thoại để em gửi báo giá chi tiết nhé?`;
      state.selectedTileId = undefined;
    } else if (wantsTiles || (!state.lastTileIds && state.surface)) {
      const words = t.replace(
        /\b(cho|toi|minh|em|anh|chi|can|muon|xem|gach|mau|lat|op|san|tuong|phong|khach|ngu|tam|bep)\b/g,
        " ",
      );
      const cards = (await suggest.run({
        surface: state.surface,
        query: words.trim() || undefined,
        maxPricePerM2,
      })) as { tileId: string; name: string; price: string }[];
      state.lastTileIds = cards.map((c) => c.tileId);
      text = cards.length
        ? `Em gợi ý ${cards.length} mẫu phù hợp ở dưới. Anh/chị chọn "mẫu 1", "mẫu 2"... và cho em diện tích (VD: 4x5 m) để em báo giá, hoặc bấm "Xem thử trên ảnh phòng" nhé.`
        : "Hiện em chưa tìm thấy mẫu đúng yêu cầu. Anh/chị thử mô tả màu hoặc phong cách khác giúp em nhé.";
    } else if (state.areaM2 && !state.selectedTileId) {
      text = `Em ghi nhận diện tích ${state.areaM2} m². Anh/chị thích phong cách nào (vân đá, vân gỗ, xi măng, gạch bông...) để em gợi ý mẫu ạ?`;
    } else if (/(gia|bao gia|bao nhieu)/.test(t)) {
      text =
        "Anh/chị chọn mẫu và cho em diện tích cần lát (VD: 4x5 m) để em tính số thùng và báo giá chính xác nhé.";
    } else {
      // Không phải câu về gạch (chính sách, đặt lịch, gặp nhân viên...) → bot luật dùng chung
      const r = await generic.respond(input);
      text = /chưa có thông tin/.test(r.text)
        ? "Anh/chị cần lát sàn hay ốp tường, và thích phong cách nào (vân đá, vân gỗ, xi măng, gạch bông)? Em sẽ gợi ý mẫu phù hợp ạ."
        : r.text;
    }

    return {
      text,
      history: [...history, { user: user.text, assistant: text, state }],
    };
  }
}
