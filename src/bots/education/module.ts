import { RuleBasedLlmGateway } from "@/adapters/llm/ruleBasedLlmGateway";
import type { ChatTool, LlmGateway, LlmTurnResult } from "@/application/ports";
import { DomainError } from "@/domain/errors";
import { fold, formatVnd } from "@/domain/text";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { BotModule } from "../types";
import { isBand, planPathway, type Pathway } from "./pathway";
import { gradePlacement, publicQuestions } from "./placement";
import { todayVn, toCard, type CourseCatalog } from "./catalog";
import { demoCourses } from "./demo";
import { calculateTuition, openIntakes, type Course } from "./domain";
import type { CourseRepository } from "./repository";

const visitorId = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/);
const band = z.number().min(0).max(9).refine((v) => Math.round(v * 2) === v * 2, "Band bước 0.5");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Lộ trình gửi widget (thẻ "Lộ trình đến band mục tiêu") */
export type PathwayView = Pathway;

const dmy = (d: string) => d.split("-").reverse().join("/");
const intakeText = (i: Course["intakes"][number]) => `${dmy(i.startDate)} · ${i.schedule} · ${i.mode === "online" ? "online" : `tại ${i.branch || "trung tâm"}`} · còn ${i.seatsLeft} chỗ`;

/** Bot theo luật của ngành đào tạo — dùng khi LLM lỗi/hết hạn mức hoặc chưa có API key */
class EducationRulesGateway implements LlmGateway {
  readonly id = "rules";
  private readonly generic = new RuleBasedLlmGateway();
  describe() {
    return { simple: "rules", complex: "rules" };
  }
  async respond(input: Parameters<LlmGateway["respond"]>[0]): Promise<LlmTurnResult> {
    const t = fold(input.user.text);
    const find = input.tools.find((x) => x.name === "find_courses");
    const plan = input.tools.find((x) => x.name === "plan_pathway");
    // "4.5 lên 6.5", "mất gốc muốn 6.5", "từ 5.0 đến 7.0"
    const bands = [...t.matchAll(/(\d(?:[.,][05])?)/g)].map((m) => Number(m[1].replace(",", "."))).filter((n) => n >= 1 && n <= 9);
    if (plan && /(ielts|band|len|lo trinh|muc tieu|dat)/.test(t) && (bands.length >= 2 || (bands.length === 1 && /mat goc|chua biet|bat dau/.test(t)))) {
      const current = bands.length >= 2 ? Math.min(...bands) : 0;
      const target = Math.max(...bands);
      const r = (await plan.run({ currentBand: current, targetBand: target })) as { steps?: string[]; finish?: string; totalTuition?: string; error?: string };
      const text = r.error ? r.error : `Lộ trình từ ${current} lên ${target}: ${r.steps?.join(" → ")}. Dự kiến xong ${r.finish}, tổng học phí niêm yết ${r.totalTuition}. Bạn làm bài test 15 câu để mình xếp đúng lớp đầu tiên nhé.`;
      return { text, history: [...input.history, { user: input.user.text, assistant: text }] };
    }
    if (find && /(khoa|lop|hoc|ielts|toeic|giao tiep|tieng|tin hoc|hoc phi|khai giang|be |con )/.test(t) && !/(dat lich|hoc thu|nhan vien|giao hang)/.test(t)) {
      const res = (await find.run({ query: input.user.text })) as { name?: string; tuition?: string; nextClass?: string }[] | { note: string };
      if (Array.isArray(res) && res.length) {
        const text = `Mình gợi ý ${res.length} khoá ở dưới: ${res.map((c) => `${c.name} (${c.tuition}${c.nextClass ? `, ${c.nextClass}` : ""})`).join("; ")}. Bạn cho mình biết trình độ hiện tại và mục tiêu để mình chọn lớp phù hợp nhất nhé, hoặc đặt lịch học thử miễn phí.`;
        return { text, history: [...input.history, { user: input.user.text, assistant: text }] };
      }
    }
    return this.generic.respond(input);
  }
}

/** Module "Tư vấn tuyển sinh & khoá học" — dữ liệu ở schema `education` */
export function makeEducationModule(deps: { catalog: CourseCatalog; courses: CourseRepository }): BotModule {
  const { catalog } = deps;
  const courseTool = (tenantId: string) => async (raw: unknown) => {
    const id = String((raw as Record<string, unknown> | undefined)?.courseId ?? "");
    const c = await catalog.get(tenantId, id);
    return c && c.active ? c : null;
  };

  return {
    kind: "education",
    clientEvents: ["placement_started", "placement_done"],
    interestEvent: "product_clicked",
    funnel: [
      { type: "widget_open", label: "Mở chat" },
      { type: "message_sent", label: "Nhắn tin" },
      { type: "placement_started", label: "Làm test đầu vào" },
      { type: "placement_done", label: "Có kết quả + lộ trình" },
      { type: "lead_created", label: "Để lại SĐT" },
    ],

    tools: ({ tenant, turn }) => {
      const getCourse = courseTool(tenant.id);
      const tools: ChatTool[] = [
        {
          name: "find_courses",
          description: "Tìm khoá học của trung tâm theo mục tiêu, đối tượng, trình độ, ngân sách hoặc hình thức học. Gọi trước khi giới thiệu bất kỳ khoá nào.",
          inputSchema: {
            type: "object",
            additionalProperties: false,
            properties: {
              query: { type: "string", description: "Mục tiêu, môn, chứng chỉ, đối tượng: 'IELTS 6.5', 'bé 7 tuổi', 'giao tiếp đi làm'..." },
              category: { type: "string", description: "Nhóm khoá nếu khách nêu rõ" },
              maxTuition: { type: "number", description: "Học phí tối đa cả khoá (VND)" },
              mode: { type: "string", enum: ["offline", "online"], description: "Hình thức học" },
            },
            required: [],
          },
          run: async (raw) => {
            const q = (raw ?? {}) as Record<string, unknown>;
            const found = await catalog.search(tenant.id, {
              query: typeof q.query === "string" ? q.query : undefined,
              category: typeof q.category === "string" ? q.category : undefined,
              maxTuition: typeof q.maxTuition === "number" ? q.maxTuition : undefined,
              mode: q.mode === "offline" || q.mode === "online" ? q.mode : undefined,
            });
            turn.productIds = found.map((c) => c.id);
            if (found.length === 0) return { results: [], note: "Không có khoá phù hợp trong danh mục." };
            const today = todayVn();
            return found.map((c) => {
              const next = openIntakes(c, today)[0];
              return { courseId: c.id, code: c.code, name: c.name, category: c.category, level: c.level, audience: c.audience, tuition: formatVnd(c.tuition), duration: `${c.durationWeeks} tuần, ${c.sessionsPerWeek} buổi/tuần`, nextClass: next ? intakeText(next) : "chưa có lớp mới" };
            });
          },
        },
        {
          name: "get_course_details",
          description: "Lấy thông tin đầy đủ của MỘT khoá: nội dung, đối tượng, cam kết đầu ra, học phí, ưu đãi và các lớp đang tuyển.",
          inputSchema: { type: "object", additionalProperties: false, properties: { courseId: { type: "string", description: "courseId lấy từ find_courses" } }, required: ["courseId"] },
          run: async (raw) => {
            const c = await getCourse(raw);
            if (!c) return { error: "Không tìm thấy khoá này" };
            turn.productIds = [c.id];
            return {
              courseId: c.id, code: c.code, name: c.name, category: c.category, level: c.level, audience: c.audience,
              duration: `${c.durationWeeks} tuần, ${c.sessionsPerWeek} buổi/tuần`, tuition: formatVnd(c.tuition),
              description: c.description || "(Trung tâm chưa nhập mô tả)", outcomes: c.outcomes || undefined,
              promos: c.promos.map((p) => (p.kind === "early_bird" ? `${p.label}: giảm ${p.percent}% nếu đăng ký đến ${dmy(p.until)}` : `${p.label}: giảm ${p.percent}% khi đăng ký từ ${p.minPeople} người`)),
              openClasses: openIntakes(c, todayVn()).map(intakeText),
            };
          },
        },
        {
          name: "list_classes",
          description: "Liệt kê các lớp còn chỗ của MỘT khoá (ngày khai giảng, lịch học, online/tại cơ sở, số chỗ còn). Dùng khi khách hỏi lịch học, bao giờ khai giảng, còn chỗ không.",
          inputSchema: {
            type: "object",
            additionalProperties: false,
            properties: { courseId: { type: "string" }, mode: { type: "string", enum: ["offline", "online"] } },
            required: ["courseId"],
          },
          run: async (raw) => {
            const c = await getCourse(raw);
            if (!c) return { error: "Không tìm thấy khoá này" };
            turn.productIds = [c.id];
            const mode = (raw as Record<string, unknown>).mode;
            const open = openIntakes(c, todayVn()).filter((i) => !mode || i.mode === mode);
            return open.length ? { course: c.name, classes: open.map(intakeText) } : { course: c.name, classes: [], note: "Hiện chưa có lớp còn chỗ — mời khách để lại số điện thoại để được báo khi mở lớp mới." };
          },
        },
        {
          name: "calculate_tuition",
          description: "Tính học phí của MỘT khoá theo số học viên và chia kỳ trả góp; tự áp ưu đãi tốt nhất đủ điều kiện (đăng ký sớm hoặc học nhóm). Luôn dùng tool này khi khách hỏi tổng tiền / giảm giá / trả góp, không tự tính.",
          inputSchema: {
            type: "object",
            additionalProperties: false,
            properties: {
              courseId: { type: "string" },
              people: { type: "number", description: "Số học viên đăng ký cùng lúc (mặc định 1)" },
              installments: { type: "number", description: "Số kỳ/tháng muốn chia (2-12), bỏ trống nếu không hỏi trả góp" },
            },
            required: ["courseId"],
          },
          run: async (raw) => {
            const c = await getCourse(raw);
            if (!c) return { error: "Không tìm thấy khoá này" };
            turn.productIds = [c.id];
            const q = raw as Record<string, unknown>;
            try {
              const r = calculateTuition(c, { people: typeof q.people === "number" ? q.people : undefined, installments: typeof q.installments === "number" ? q.installments : undefined, today: todayVn() });
              return {
                course: c.name,
                listPrice: formatVnd(r.listPrice),
                people: r.people,
                discount: r.discountLabel ? `${r.discountLabel} -${r.discountPercent}% (tiết kiệm ${formatVnd(r.discount)})` : "Không có ưu đãi áp dụng",
                perPerson: formatVnd(r.perPerson),
                total: formatVnd(r.total),
                installment: r.perInstallment ? `${r.installments} kỳ × ${formatVnd(r.perInstallment)}` : undefined,
                notes: r.notes,
              };
            } catch (e) {
              if (e instanceof DomainError) return { error: e.message };
              throw e;
            }
          },
        },
        {
          name: "plan_pathway",
          description:
            "Lập lộ trình IELTS từ band hiện tại lên band mục tiêu bằng các khoá CÓ THẬT của trung tâm: thứ tự khoá, lớp đang tuyển, ngày học xong, tổng học phí, có kịp ngày thi không. Luôn dùng khi khách hỏi 'học bao lâu', 'kịp thi không', 'từ X lên Y' — không tự ước lượng.",
          inputSchema: {
            type: "object",
            additionalProperties: false,
            properties: {
              currentBand: { type: "number", description: "Band hiện tại (0 nếu mất gốc), bước 0.5" },
              targetBand: { type: "number", description: "Band mục tiêu, bước 0.5" },
              examDate: { type: "string", description: "Ngày thi dự kiến YYYY-MM-DD (nếu khách nói)" },
            },
            required: ["currentBand", "targetBand"],
          },
          run: async (raw) => {
            const q = (raw ?? {}) as Record<string, unknown>;
            try {
              const p = planPathway(await catalog.list(tenant.id, { activeOnly: true }), {
                current: Number(q.currentBand),
                target: Number(q.targetBand),
                today: todayVn(),
                examDate: typeof q.examDate === "string" && q.examDate ? q.examDate : undefined,
              });
              turn.productIds = p.steps.map((x) => x.courseId);
              turn.extras.pathway = JSON.stringify(p);
              return {
                steps: p.steps.map((x) => `${x.name} (${x.from} → ${x.to}, ${x.weeks} tuần, ${formatVnd(x.tuition)}, bắt đầu ${dmy(x.start)}${x.intake ? "" : " dự kiến"})`),
                finish: p.finishDate ? dmy(p.finishDate) : undefined,
                totalWeeks: p.totalWeeks,
                totalTuition: formatVnd(p.totalTuition),
                reachesTarget: p.reachesTarget,
                onTime: p.onTime,
                notes: p.notes,
              };
            } catch (e) {
              if (e instanceof DomainError) return { error: e.message };
              throw e;
            }
          },
        },
        {
          name: "offer_placement_test",
          description: "Hiện nút làm bài test xếp lớp 15 câu (khoảng 10 phút) ngay trong khung chat. Dùng khi khách chưa biết trình độ, hỏi 'mình đang ở mức nào', hoặc trước khi chốt lớp đầu tiên.",
          inputSchema: { type: "object", additionalProperties: false, properties: { targetBand: { type: "number", description: "Band mục tiêu nếu khách đã nói" } }, required: [] },
          run: async (raw) => {
            const tb = Number((raw as Record<string, unknown> | undefined)?.targetBand);
            turn.extras.offerTest = isBand(tb) ? String(tb) : "1";
            return { shown: true, note: "Đã hiện nút làm test trong khung chat; kết quả kèm lộ trình đến band mục tiêu." };
          },
        },
      ];
      return tools;
    },

    promptLines: () => [
      `Bạn là tư vấn viên của trung tâm tiếng Anh / luyện thi IELTS. Mục tiêu: hiểu mục tiêu và trình độ của học viên (hoặc phụ huynh), chọn đúng khoá và lớp còn chỗ, nêu rõ học phí và ưu đãi, rồi mời học thử miễn phí hoặc test trình độ bằng công cụ đặt lịch và xin tên + số điện thoại/Zalo.`,
      `- Hỏi tối đa 3 câu để chọn khoá: ai học (tuổi/đối tượng), trình độ hiện tại, mục tiêu và thời hạn (điểm số, chứng chỉ, đi làm), và buổi học tiện nhất. Không hỏi dồn một lúc.`,
      `- Chỉ giới thiệu khoá lấy từ find_courses; lịch khai giảng và chỗ còn lấy từ list_classes; học phí, ưu đãi, trả góp luôn gọi calculate_tuition — không tự cộng/nhân/giảm giá.`,
      `- Không cam kết điểm số hay kết quả ngoài phần "cam kết đầu ra" trung tâm đã nhập. Không so sánh xấu với trung tâm khác.`,
      `- Lớp hết chỗ hoặc chưa có lớp: đề nghị để lại số điện thoại để báo khi mở lớp mới.`,
      `- Khách chưa biết trình độ: gọi offer_placement_test (test 15 câu ngay trong chat). Khách hỏi học bao lâu / từ X lên Y / kịp ngày thi không: gọi plan_pathway rồi nhắc lại đúng thứ tự khoá, ngày xong và tổng học phí.`,
      `- Band là ước lượng; không hứa điểm. Nói/Viết cần giáo viên kiểm tra trong buổi test miễn phí.`,
    ],

    async groundingFacts(tenant) {
      const all = await catalog.list(tenant.id);
      return { amounts: all.map((c) => c.tuition).filter((n) => n >= 1000), skus: all.map((c) => c.code) };
    },

    async shopSummary(tenantId) {
      const [cats, all] = await Promise.all([catalog.categories(tenantId), catalog.list(tenantId, { activeOnly: true })]);
      const today = todayVn();
      const open = all.reduce((n, c) => n + openIntakes(c, today).length, 0);
      return `Trung tâm đào tạo, ${all.length} khoá (${cats.join(", ") || "chưa có"}), ${open} lớp đang tuyển. Có học thử miễn phí và test trình độ.`;
    },

    async cards(tenantId, ids) {
      return catalog.cardsByIds(tenantId, ids);
    },
    async namesByIds(tenantId, ids) {
      return new Map((await deps.courses.findManyByIds(tenantId, ids)).map((c) => [c.id, c.name]));
    },
    async resolveExtras(_tenantId, extras) {
      const out: Record<string, unknown> = {};
      if (extras.offerTest) out.offerTest = extras.offerTest;
      if (extras.pathway) {
        try {
          out.pathway = JSON.parse(extras.pathway) as PathwayView;
        } catch {
          /* bỏ qua */
        }
      }
      return out;
    },
    fallbackLlm: new EducationRulesGateway(),
    publicConfig: async () => ({ placementTest: true }),

    /** /api/public/[tenant]/x/test (GET câu hỏi, POST chấm) | pathway | lead */
    async handlePublic(ctx) {
      const action = ctx.path[0];
      const { tenant } = ctx;
      if (ctx.req.method === "GET" && action === "test") return NextResponse.json({ questions: publicQuestions() });
      if (ctx.req.method !== "POST") return NextResponse.json({ error: "Không hỗ trợ" }, { status: 405 });
      const raw = await ctx.req.json();
      const all = () => catalog.list(tenant.id, { activeOnly: true });

      if (action === "test") {
        const body = z
          .object({ visitorId, conversationId: z.string().uuid().nullable().optional(), answers: z.record(z.string().max(10), z.number().int().min(-1).max(5)), targetBand: band.optional(), examDate: isoDate.optional() })
          .parse(raw);
        if (!ctx.rateLimit(`ptest:${tenant.id}:${body.visitorId}`, 10, 60 * 60_000)) return NextResponse.json({ error: "Quá nhiều lần làm bài, thử lại sau nhé" }, { status: 429 });
        const result = gradePlacement(body.answers);
        const conversationId = await ctx.ownConversation(body.visitorId, body.conversationId);
        // events.value là số nguyên → lưu band × 10 (4.5 → 45); refId ghi CEFR để đọc báo cáo
        await ctx.trackEvent({ visitorId: body.visitorId, type: "placement_done", conversationId, refId: result.cefr, value: Math.round(result.band * 10) });
        const pathway = body.targetBand && body.targetBand > result.band ? planPathway(await all(), { current: result.band, target: body.targetBand, today: todayVn(), examDate: body.examDate }) : null;
        return NextResponse.json({ result, pathway });
      }

      if (action === "pathway") {
        const body = z.object({ visitorId, current: band, target: band, examDate: isoDate.optional() }).parse(raw);
        return NextResponse.json({ pathway: planPathway(await all(), { current: body.current, target: body.target, today: todayVn(), examDate: body.examDate }) });
      }

      if (action === "lead") {
        const body = z
          .object({
            visitorId,
            conversationId: z.string().uuid().nullable().optional(),
            name: z.string().min(1).max(80),
            phone: z.string().min(9).max(20),
            note: z.string().max(1000).default(""),
            band: band.optional(),
            cefr: z.string().max(8).optional(),
            target: band.optional(),
            examDate: isoDate.optional(),
            plan: z.string().max(600).default(""),
          })
          .parse(raw);
        if (!ctx.rateLimit(`elead:${tenant.id}:${body.visitorId}`, 5, 60 * 60_000)) return NextResponse.json({ error: "Bạn đã gửi thông tin rồi, tư vấn viên sẽ liên hệ sớm." }, { status: 429 });
        const meta: Record<string, string | number> = {};
        if (body.band !== undefined) meta.placementBand = body.band;
        if (body.cefr) meta.cefr = body.cefr;
        if (body.target !== undefined) meta.targetBand = body.target;
        if (body.examDate) meta.examDate = body.examDate;
        if (body.plan) meta.pathway = body.plan;
        const note = [
          body.note,
          body.band !== undefined && `Test đầu vào: ${body.cefr ?? ""} ≈ band ${body.band}`,
          body.target !== undefined && `mục tiêu ${body.target}${body.examDate ? ` trước ${dmy(body.examDate)}` : ""}`,
          body.plan && `Lộ trình: ${body.plan}`,
        ]
          .filter(Boolean)
          .join(" — ");
        const lead = await ctx.captureLead({ visitorId: body.visitorId, conversationId: await ctx.ownConversation(body.visitorId, body.conversationId), name: body.name, phone: body.phone, note, meta });
        return NextResponse.json({ ok: true, leadId: lead.id });
      }
      return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    },
    variantFor: async () => "default",
    onCreate: async () => undefined,

    async seedDemo(tenantId) {
      // Gọi lại được: thêm khoá demo còn thiếu; demo cũ (tiếng Nhật, tin học) ngừng bán vì bot đã thu hẹp về IELTS
      const existing = await deps.courses.list(tenantId);
      const have = new Set(existing.map((c) => c.code));
      for (const c of existing) if (["N5-JP", "MOS-VP"].includes(c.code) && c.active) await deps.courses.update(tenantId, c.id, { active: false });
      const ids: string[] = [];
      for (const c of demoCourses(todayVn())) if (!have.has(c.code)) ids.push((await deps.courses.create({ ...c, tenantId })).id);
      return ids;
    },
  };
}

export { toCard as courseToCard };
