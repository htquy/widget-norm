import { DomainError } from "@/domain/errors";

/**
 * Bài test xếp lớp nhanh (ngữ pháp – từ vựng – đọc hiểu ngắn), 3 câu mỗi cấp A1 → C1.
 * Đáp án chỉ nằm ở server; trình duyệt chỉ nhận câu hỏi. Kết quả là ƯỚC LƯỢNG để xếp lớp,
 * không thay bài thi thật (không đo Nói/Viết).
 */
export const CEFR = ["A1", "A2", "B1", "B2", "C1"] as const;
export type Cefr = (typeof CEFR)[number];

interface Question {
  id: string;
  level: Cefr;
  skill: "grammar" | "vocab" | "reading";
  prompt: string;
  options: string[];
  answer: number;
}

const Q: Question[] = [
  { id: "a1-1", level: "A1", skill: "grammar", prompt: "My sister ___ a nurse at the city hospital.", options: ["are", "is", "am", "be"], answer: 1 },
  { id: "a1-2", level: "A1", skill: "vocab", prompt: "We eat breakfast in the ___.", options: ["morning", "night", "evening", "weekend"], answer: 0 },
  { id: "a1-3", level: "A1", skill: "grammar", prompt: "___ you like coffee?", options: ["Does", "Is", "Do", "Are"], answer: 2 },
  { id: "a2-1", level: "A2", skill: "grammar", prompt: "Last weekend we ___ to the beach with our cousins.", options: ["go", "have gone", "were go", "went"], answer: 3 },
  { id: "a2-2", level: "A2", skill: "vocab", prompt: "The bus was late, so I ___ my train.", options: ["missed", "lost", "forgot", "left"], answer: 0 },
  { id: "a2-3", level: "A2", skill: "grammar", prompt: "This laptop is ___ than the one I bought last year.", options: ["more light", "lightest", "lighter", "most light"], answer: 2 },
  { id: "b1-1", level: "B1", skill: "grammar", prompt: "I ___ in this company since I graduated.", options: ["work", "am working", "worked", "have worked"], answer: 3 },
  { id: "b1-2", level: "B1", skill: "vocab", prompt: "Could you ___ the meeting until Friday? I'm travelling on Thursday.", options: ["put off", "put on", "take off", "give up"], answer: 0 },
  {
    id: "b1-3",
    level: "B1",
    skill: "reading",
    prompt: "\"Members can borrow up to five books at a time. Books must be returned within three weeks; late returns are charged a small fee per day.\" — What happens if you keep a book for four weeks?",
    options: ["You cannot borrow books again", "Nothing, four weeks is allowed", "You pay a fee for the extra days", "You must buy the book"],
    answer: 2,
  },
  { id: "b2-1", level: "B2", skill: "grammar", prompt: "If the team ___ the warning signs earlier, the project would not have failed.", options: ["had noticed", "noticed", "would notice", "has noticed"], answer: 0 },
  { id: "b2-2", level: "B2", skill: "vocab", prompt: "The new policy had a significant ___ on small businesses in the region.", options: ["affect", "result in", "effective", "impact"], answer: 3 },
  {
    id: "b2-3",
    level: "B2",
    skill: "reading",
    prompt: "\"Although remote work has reduced commuting costs, several studies suggest it may weaken informal knowledge sharing among junior staff.\" — The writer's view of remote work is:",
    options: ["entirely positive", "balanced, noting a possible drawback", "entirely negative", "not mentioned"],
    answer: 1,
  },
  { id: "c1-1", level: "C1", skill: "grammar", prompt: "Not only ___ the deadline, but they also exceeded the budget.", options: ["they missed", "they did miss", "did they miss", "missed they"], answer: 2 },
  { id: "c1-2", level: "C1", skill: "vocab", prompt: "The minister's remarks were deliberately ___, leaving journalists unsure of the government's position.", options: ["explicit", "ambitious", "anonymous", "ambiguous"], answer: 3 },
  {
    id: "c1-3",
    level: "C1",
    skill: "reading",
    prompt: "\"The findings, while compelling, rest on a sample too narrow to warrant the sweeping conclusions some commentators have drawn.\" — The writer suggests that the conclusions are:",
    options: ["well supported", "overgeneralised", "deliberately false", "too cautious"],
    answer: 1,
  },
];

export const PLACEMENT_SIZE = Q.length;
export const publicQuestions = () => Q.map(({ id, level, skill, prompt, options }) => ({ id, level, skill, prompt, options }));
export type PublicQuestion = ReturnType<typeof publicQuestions>[number];

/** CEFR ↔ band IELTS ước lượng (theo bảng quy đổi công khai của Cambridge/IELTS, làm tròn) */
const BAND: Record<Cefr | "pre", number> = { pre: 2.5, A1: 3, A2: 4, B1: 5, B2: 6, C1: 7 };

export interface PlacementResult {
  correct: number;
  total: number;
  cefr: Cefr | "Pre-A1";
  /** Band IELTS ước lượng (bước 0.5) */
  band: number;
  byLevel: Record<Cefr, { correct: number; total: number }>;
  notes: string[];
}

/**
 * Cấp đạt được = cấp cao nhất mà khách đúng ≥ 2/3 VÀ mọi cấp thấp hơn cũng đạt ≥ 2/3
 * (tránh đoán trúng câu khó). Đúng 1 câu ở cấp kế tiếp → cộng 0.5 band.
 */
export function gradePlacement(answers: Record<string, number>): PlacementResult {
  const answered = Q.filter((q) => typeof answers[q.id] === "number");
  if (answered.length < Q.length * 0.8) throw new DomainError("INCOMPLETE_TEST", "Anh/chị trả lời ít nhất 12/15 câu để kết quả đủ tin cậy");
  const byLevel = Object.fromEntries(CEFR.map((l) => [l, { correct: 0, total: 0 }])) as PlacementResult["byLevel"];
  for (const q of Q) {
    byLevel[q.level].total++;
    if (answers[q.id] === q.answer) byLevel[q.level].correct++;
  }
  let reached: Cefr | null = null;
  for (const l of CEFR) {
    if (byLevel[l].correct / byLevel[l].total >= 2 / 3) reached = l;
    else break;
  }
  const idx = reached ? CEFR.indexOf(reached) : -1;
  const next = CEFR[idx + 1];
  let band = reached ? BAND[reached] : BAND.pre;
  if (next && byLevel[next].correct >= 1) band += 0.5;
  const correct = CEFR.reduce((s, l) => s + byLevel[l].correct, 0);
  const notes = ["Bài test 15 câu ước lượng ngữ pháp, từ vựng và đọc hiểu; kỹ năng Nghe, Nói, Viết cần giáo viên kiểm tra trong buổi test miễn phí."];
  if (reached && idx >= 0 && next && byLevel[next].correct === byLevel[next].total) notes.push(`Anh/chị làm đúng cả phần ${next} — có thể trình độ cao hơn kết quả này, nên test trực tiếp.`);
  return { correct, total: Q.length, cefr: reached ?? "Pre-A1", band, byLevel, notes };
}
