import type { DecisionGateway } from "@/application/ports";
import type { Decision, DecisionLabel } from "@/domain/decision";
import { fold } from "@/domain/text";

/**
 * Phân loại theo luật (tiếng Việt, bỏ dấu) — dự phòng khi jev lỗi/hết hạn mức, và dùng khi chưa có API key.
 * Độ tin cậy đặt thận trọng: không chắc → < 0.6 → chat use case gọi LLM như bình thường.
 */
const RULES: { label: DecisionLabel; re: RegExp; confidence: number; sentiment?: Decision["sentiment"] }[] = [
  { label: "injection", re: /(bo qua|quen|ignore|disregard).{0,30}(huong dan|chi dan|lenh|prompt|instruction|quy tac)|system prompt|dong vai|act as|jailbreak|tiet lo (prompt|huong dan)/, confidence: 0.9 },
  { label: "abuse", re: /\b(dm|dmm|dcm|dit|du ma|vcl|vkl|clgt|oc cho|fuck|shit|dkm|do ngu|ngu the|ngu vay|ngu qua|vo dung)\b/, confidence: 0.85, sentiment: "negative" },
  { label: "complaint", re: /(te qua|qua te|that vong|buc minh|buc xuc|khieu nai|lua dao|hoan tien|khong hai long|cham qua|giao sai|giao thieu|bi loi|bi hong|hang gia|kem chat luong|bi di ung|man do|thai do|giai quyet (sao|the nao)|vo nap|bi vo)/, confidence: 0.8, sentiment: "negative" },
  { label: "human_request", re: /(nhan vien|nguoi that|gap (quan ly|nguoi|chu shop)|goi lai (cho|giup|minh|em|toi)|tu van vien|noi chuyen voi (nguoi|admin)|chuyen (cho|sang) nguoi)/, confidence: 0.85 },
  { label: "not_in_data", re: /(don hang.{0,24}(cua (minh|em|toi)|toi dau|den dau|giao chua|o dau)|ma don|van don|tracking|cong no|kiem tra don|don (toi|minh|em) (dau|giao|toi dau)|hoa don (cua|minh))/, confidence: 0.75 },
  { label: "booking", re: /(dat lich|dat hen|hen lich|lich hen|book|lich trong|con lich|giu cho|dat cho|dat ban|hen gio|dang ky (lich|kham|tu van))/, confidence: 0.85 },
  { label: "ask_contact", re: /(dia chi|o dau|hotline|so dien thoai|sdt|gio mo cua|may gio (mo|dong)|mo cua|dong cua|lien he|chi nhanh|fanpage|zalo (shop|cua))/, confidence: 0.8 },
  { label: "off_topic", re: /(giai .{0,12}(toan|bai)|bai tap|dao ham|viet .{0,16}code|\bcode\b|python|javascript|lap trinh|thoi tiet|bong da|chinh tri|ke chuyen|lam tho|dich (doan|bai)|xo so)/, confidence: 0.75 },
  { label: "knowledge_query", re: /(giao hang|ship|van chuyen|doi tra|tra hang|bao hanh|thanh toan|tra gop|chuyen khoan|khuyen mai|giam gia|freeship|\bcod\b|uu dai|voucher|chinh sach|the thanh vien|doi (duoc|hang|san pham)|mo nap)/, confidence: 0.7 },
  { label: "needs_consult", re: /(tu van|nen chon|nen dung|nen mua|phu hop|goi y|so sanh|khac (gi|nhau)|loai nao tot|da (dau|kho|nhay cam|hon hop)|cho (be|nguoi gia|ba bau))/, confidence: 0.68 },
  { label: "product_query", re: /(\bgia\b|bao nhieu|con hang|het hang|co ban|san pham|thanh phan|dung tich|size|mau (nao|gi)|cong dung|xuat xu|chinh hang)/, confidence: 0.68 },
];

const GREETING = /^(xin chao|chao|hello|hi|hey|alo|shop oi|ad oi|admin oi|em oi|ban oi)( (shop|ad|ban|em|a|nhe|nha|ca nha))*[\s!.,?]*$/;
const THANKS = /^((cam on|thanks|thank you|thank|tks|ok|oke|okela|vang|da|duoc roi|tam biet|bye|hen gap lai)[\s!.,]*)+((shop|ad|ban|em|a|nhe|nha|nhieu)[\s!.,]*)*$/;
const NEGATIVE = /(\bte qua\b|\bqua te\b|\bchan\b|\bbuc\b|that vong|kho chiu|khong hai long|cham qua|toi te|qua dang|vo ly|\bngu\b)/;
const POSITIVE = /(tot qua|tuyet|hay qua|thich|hai long|cam on|dep qua|xin qua)/;
const STOP = new Set("cho toi minh em anh chi ban shop co khong ko la gi nao the nhu va voi cua can muon xem hoi giup nhe a ah oi duoc dang con thi ma nay do roi".split(" "));

/** Chủ đề ngắn từ các từ có nghĩa đầu tiên (giữ dấu cho dễ đọc) */
export function roughTopic(text: string): string {
  const words = text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 2 && !STOP.has(fold(w)));
  return words.slice(0, 4).join(" ") || "khác";
}

export function classifyByRules(text: string): Decision {
  const t = fold(text).trim();
  const sentiment: Decision["sentiment"] = NEGATIVE.test(t) ? "negative" : POSITIVE.test(t) ? "positive" : "neutral";
  const difficulty: Decision["difficulty"] = t.length > 140 || (t.match(/\?/g)?.length ?? 0) >= 2 || /(so sanh|nen chon|hay la|khac nhau)/.test(t) ? "complex" : "simple";
  const base = { topic: roughTopic(text), need: text.trim().slice(0, 160), difficulty, source: "rules" };
  if (t.length <= 40 && GREETING.test(t)) return { ...base, label: "greeting", confidence: 0.9, sentiment: "neutral", topic: "chào hỏi" };
  if (t.length <= 40 && THANKS.test(t)) return { ...base, label: "thanks_bye", confidence: 0.85, sentiment: "positive", topic: "cảm ơn" };
  for (const r of RULES) {
    if (r.re.test(t)) return { ...base, label: r.label, confidence: r.confidence, sentiment: r.sentiment ?? sentiment };
  }
  return { ...base, label: "needs_consult", confidence: 0.4, sentiment };
}

export class RuleDecisionGateway implements DecisionGateway {
  readonly id = "rules";
  readonly model = "rules";
  async classify({ text }: { text: string }) {
    return classifyByRules(text);
  }
}
