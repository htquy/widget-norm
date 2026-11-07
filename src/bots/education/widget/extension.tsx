"use client";

import { useTr } from "@/components/widget/i18n";
import { useEffect, useMemo, useState } from "react";
import type { ExtHelpers, WidgetExtension } from "@/components/widget/extension";
import { ProductCards } from "@/components/widget/Panels";
import type { ProductCard } from "@/components/widget/api";
import { educationApi, type EducationApi, type PathwayView, type PlacementResult, type PublicQuestion } from "./api";

const vnd = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n)) + " ₫";
const dmy = (d: string) => d.split("-").reverse().join("/");
const btn = "flex min-h-9 shrink-0 items-center rounded-[var(--w-r-pill)] px-3 text-[13px] font-medium transition";
const field = "min-h-10 w-full rounded-lg border border-[var(--w-border)] bg-[var(--w-surface)] px-2.5 text-[13px] text-[var(--w-fg)]";
const BANDS = Array.from({ length: 15 }, (_, i) => 2 + i * 0.5);
const SKILL: Record<string, string> = { grammar: "Ngữ pháp", vocab: "Từ vựng", reading: "Đọc hiểu" };
const planText = (p: PathwayView) => p.steps.map((s) => `${s.name} (${dmy(s.start)}–${dmy(s.end)})`).join(" → ") + ` · ${vnd(p.totalTuition)}`;

/** Thẻ lộ trình: các khoá nối tiếp trên trục thời gian, ngày xong, kịp ngày thi không */
export function PathwayCard({ p, onLead }: { p: PathwayView; onLead?: () => void }) {
  const t = useTr();
  return (
    <div className="overflow-hidden rounded-[var(--w-r-bubble)] border border-[var(--w-border)] bg-[var(--w-surface)]">
      <div className="flex items-baseline justify-between gap-2 border-b border-[var(--w-border)] px-3 py-2">
        <p className="text-[13px] font-semibold text-[var(--w-fg)]">
          Lộ trình band {p.current} → {p.target}
        </p>
        <span className="text-[11.5px] text-[var(--w-muted)]">{p.totalWeeks} tuần</span>
      </div>
      <ol className="relative space-y-3 px-3 py-3">
        {p.steps.map((s, i) => (
          <li key={s.courseId} className="relative pl-6">
            <span className="absolute left-0 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--w-primary)] text-[9px] font-bold text-[var(--w-on-primary)]">{i + 1}</span>
            {i < p.steps.length - 1 && <span className="absolute left-[7px] top-5 h-[calc(100%-4px)] w-0.5 bg-[var(--w-border)]" />}
            <p className="text-[12.5px] font-semibold text-[var(--w-fg)]">
              {s.name} <span className="font-normal text-[var(--w-muted)]">· {s.from} → {s.to}</span>
            </p>
            <p className="text-[11.5px] text-[var(--w-muted)]">
              {dmy(s.start)} – {dmy(s.end)} · {s.weeks} tuần, {s.sessionsPerWeek} buổi/tuần · {vnd(s.tuition)}
            </p>
            <p className="text-[11.5px] text-[var(--w-muted)]">
              {s.intake ? `${s.intake.schedule} · ${s.intake.mode === "online" ? "online" : s.intake.branch} · còn ${s.intake.seatsLeft} chỗ` : t("Lớp chưa mở — ngày dự kiến")}
            </p>
          </li>
        ))}
      </ol>
      <div className="space-y-1 border-t border-[var(--w-border)] px-3 py-2 text-[11.5px] text-[var(--w-muted)]">
        <p className="flex justify-between text-[13px] font-bold text-[var(--w-fg)]">
          <span>{t("Tổng học phí niêm yết")}</span>
          <span className="tabular-nums text-[var(--w-primary)]">{vnd(p.totalTuition)}</span>
        </p>
        {p.finishDate && (
          <p>
            Dự kiến xong {dmy(p.finishDate)}
            {p.examDate && (p.onTime ? ` — kịp ngày thi ${dmy(p.examDate)}` : ` — KHÔNG kịp ngày thi ${dmy(p.examDate)}`)}
          </p>
        )}
        {!p.reachesTarget && <p className="text-amber-700">Các khoá hiện có đưa tới band {p.reached}.</p>}
        {p.notes.slice(0, 2).map((n) => (
          <p key={n}>• {n}</p>
        ))}
      </div>
      {onLead && (
        <div className="px-3 pb-3">
          <button type="button" onClick={onLead} className="min-h-10 w-full rounded-lg bg-[var(--w-primary)] text-[13px] font-semibold text-[var(--w-on-primary)]">
            {t("Giữ chỗ lớp đầu tiên & nhận tư vấn")}
          </button>
        </div>
      )}
    </div>
  );
}

function LeadForm({ api, h, ctx, onDone }: { api: EducationApi; h: ExtHelpers; ctx: { band?: number; cefr?: string; target?: number; examDate?: string; pathway?: PathwayView | null }; onDone: () => void }) {
  const t = useTr();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [error, setError] = useState("");
  if (state === "sent") return <p className="rounded-lg bg-emerald-50 p-3 text-[13px] text-emerald-900">{t("Đã gửi. Tư vấn viên sẽ gọi để xác nhận lớp và lịch test Nói/Viết miễn phí.")}</p>;
  return (
    <form
      className="grid grid-cols-2 gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("busy");
        setError("");
        try {
          await api.lead({ conversationId: h.conversationId, name, phone, note: t("Từ test đầu vào / lộ trình trong chat"), band: ctx.band, cefr: ctx.cefr, target: ctx.target, examDate: ctx.examDate, plan: ctx.pathway ? planText(ctx.pathway).slice(0, 600) : "" });
          setState("sent");
          onDone();
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
          setState("idle");
        }
      }}
    >
      <input required value={name} onChange={(e) => setName(e.target.value)} placeholder={t("Họ tên")} className={field} />
      <input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("Số điện thoại / Zalo")} inputMode="tel" className={field} />
      <button type="submit" disabled={state === "busy"} className="col-span-2 min-h-10 rounded-lg bg-[var(--w-primary)] text-[13px] font-semibold text-[var(--w-on-primary)] disabled:opacity-60">
        {t("Gửi cho tư vấn viên")}
      </button>
      {error && <p className="col-span-2 text-[12px] text-rose-700">{error}</p>}
    </form>
  );
}

/** Bài test 15 câu: từng câu một, thanh tiến độ, kết quả CEFR + band + lộ trình */
function PlacementPanel({ h, initialTarget }: { h: ExtHelpers; initialTarget?: number }) {
  const t = useTr();
  const api = useMemo(() => educationApi(h.tenant, h.visitorId), [h.tenant, h.visitorId]);
  const [qs, setQs] = useState<PublicQuestion[]>([]);
  const [i, setI] = useState(-1);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [target, setTarget] = useState(initialTarget ?? 6.5);
  const [exam, setExam] = useState("");
  const [res, setRes] = useState<{ result: PlacementResult; pathway: PathwayView | null } | null>(null);
  const [lead, setLead] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.questions().then((r) => setQs(r.questions)).catch(() => setError(t("Không tải được bài test")));
  }, [api]);

  async function finish(all: Record<string, number>) {
    setError("");
    try {
      setRes(await api.grade({ conversationId: h.conversationId, answers: all, targetBand: target, examDate: exam || undefined }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const q = qs[i];
  return (
    <div className="flex h-full flex-col bg-[var(--w-surface)]">
      <header className="flex items-center justify-between border-b border-[var(--w-border)] px-3 py-2.5">
        <div>
          <p className="text-[14px] font-semibold text-[var(--w-fg)]">{t("Test xếp lớp IELTS")}</p>
          <p className="text-[11.5px] text-[var(--w-muted)]">{t("15 câu · khoảng 10 phút · miễn phí")}</p>
        </div>
        <button type="button" onClick={h.closePanel} className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--w-muted)] hover:bg-[var(--w-surface-2)]" aria-label={t("Đóng")}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {res ? (
          <div className="space-y-3">
            <div className="rounded-2xl bg-[var(--w-surface-2)] p-4 text-center">
              <p className="text-[12px] uppercase tracking-wide text-[var(--w-muted)]">{t("Trình độ ước lượng")}</p>
              <p className="mt-1 text-[34px] font-bold leading-none text-[var(--w-primary)]">{res.result.band.toFixed(1)}</p>
              <p className="mt-1 text-[13px] text-[var(--w-fg)]">
                CEFR {res.result.cefr} · đúng {res.result.correct}/{res.result.total} câu
              </p>
              <div className="mt-3 grid grid-cols-5 gap-1 text-[10.5px] text-[var(--w-muted)]">
                {Object.entries(res.result.byLevel).map(([l, v]) => (
                  <div key={l}>
                    <div className="flex h-12 flex-col justify-end overflow-hidden rounded bg-[var(--w-border)]">
                      <div className="w-full bg-[var(--w-primary)]" style={{ height: `${(v.correct / v.total) * 100}%` }} />
                    </div>
                    {l}
                  </div>
                ))}
              </div>
            </div>
            {res.result.notes.map((n) => (
              <p key={n} className="text-[12px] text-[var(--w-muted)]">• {n}</p>
            ))}
            {res.pathway ? <PathwayCard p={res.pathway} onLead={() => setLead(true)} /> : <p className="text-[13px] text-[var(--w-fg)]">Anh/chị đã đạt hoặc vượt band mục tiêu {target}. Tư vấn viên sẽ gợi ý lớp luyện đề phù hợp.</p>}
            {(lead || !res.pathway) && (
              <LeadForm api={api} h={h} ctx={{ band: res.result.band, cefr: res.result.cefr, target, examDate: exam || undefined, pathway: res.pathway }} onDone={() => undefined} />
            )}
            <button
              type="button"
              onClick={() => {
                h.closePanel();
                h.send(`Mình vừa làm test: ${res.result.cefr}, khoảng band ${res.result.band}. Mục tiêu ${target}${exam ? ` trước ${dmy(exam)}` : ""}. Tư vấn giúp mình lớp phù hợp nhé.`);
              }}
              className="min-h-10 w-full rounded-lg border border-[var(--w-border)] text-[13px] font-medium text-[var(--w-fg)]"
            >
              {t("Hỏi thêm tư vấn viên")}
            </button>
          </div>
        ) : i < 0 ? (
          <div className="space-y-4">
            <p className="text-[13.5px] leading-relaxed text-[var(--w-fg)]">{t("Bài test ước lượng ngữ pháp, từ vựng và đọc hiểu từ A1 đến C1. Xong bài, anh/chị có ngay band ước lượng và lộ trình bằng các lớp đang tuyển của trung tâm.")}</p>
            <label className="block text-[12px] text-[var(--w-muted)]">
              {t("Band mục tiêu")}
              <select value={target} onChange={(e) => setTarget(Number(e.target.value))} className={field}>
                {BANDS.map((b) => (
                  <option key={b} value={b}>{b.toFixed(1)}</option>
                ))}
              </select>
            </label>
            <label className="block text-[12px] text-[var(--w-muted)]">
              {t("Ngày thi dự kiến (nếu có)")}
              <input type="date" value={exam} onChange={(e) => setExam(e.target.value)} className={field} />
            </label>
            <button
              type="button"
              disabled={!qs.length}
              onClick={() => {
                setI(0);
                api.track("placement_started", h.conversationId);
              }}
              className="min-h-11 w-full rounded-xl bg-[var(--w-primary)] text-[14px] font-semibold text-[var(--w-on-primary)] disabled:opacity-60"
            >
              {t("Bắt đầu làm bài")}
            </button>
          </div>
        ) : q ? (
          <div className="space-y-3">
            <div className="h-1.5 overflow-hidden rounded bg-[var(--w-border)]">
              <div className="h-full bg-[var(--w-primary)] transition-all" style={{ width: `${(i / qs.length) * 100}%` }} />
            </div>
            <p className="text-[11.5px] text-[var(--w-muted)]">
              Câu {i + 1}/{qs.length} · {t(SKILL[q.skill])}
            </p>
            <p className="text-[14.5px] leading-relaxed text-[var(--w-fg)]">{q.prompt}</p>
            <div className="grid gap-2">
              {q.options.map((o, k) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => {
                    const next = { ...answers, [q.id]: k };
                    setAnswers(next);
                    if (i + 1 < qs.length) setI(i + 1);
                    else void finish(next);
                  }}
                  className={`min-h-11 rounded-xl border px-3 text-left text-[13.5px] transition ${answers[q.id] === k ? "border-[var(--w-primary)] bg-[var(--w-surface-2)]" : "border-[var(--w-border)] hover:border-[var(--w-primary)]"} text-[var(--w-fg)]`}
                >
                  <span className="mr-2 font-semibold text-[var(--w-muted)]">{"ABCD"[k]}.</span>
                  {o}
                </button>
              ))}
            </div>
            <div className="flex justify-between">
              <button type="button" disabled={i === 0} onClick={() => setI(i - 1)} className="min-h-9 px-2 text-[12.5px] text-[var(--w-muted)] disabled:opacity-40">
                {t("← Câu trước")}
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = { ...answers, [q.id]: -1 };
                  setAnswers(next);
                  if (i + 1 < qs.length) setI(i + 1);
                  else void finish(next);
                }}
                className="min-h-9 px-2 text-[12.5px] text-[var(--w-muted)]"
              >
                {t("Không biết, bỏ qua →")}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-[var(--w-muted)]">{t("Đang chấm bài…")}</p>
        )}
        {error && <p className="mt-3 text-[12px] text-rose-700">{error}</p>}
      </div>
    </div>
  );
}

/** Form nhanh: band hiện tại + mục tiêu + ngày thi → lộ trình */
function PathwayPanel({ h }: { h: ExtHelpers }) {
  const t = useTr();
  const api = useMemo(() => educationApi(h.tenant, h.visitorId), [h.tenant, h.visitorId]);
  const [cur, setCur] = useState(4.5);
  const [target, setTarget] = useState(6.5);
  const [exam, setExam] = useState("");
  const [p, setP] = useState<PathwayView | null>(null);
  const [lead, setLead] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="space-y-3 p-4">
      <p className="text-[14px] font-semibold text-[var(--w-fg)]">{t("Lộ trình đến band mục tiêu")}</p>
      <div className="grid grid-cols-3 gap-2">
        <label className="text-[11.5px] text-[var(--w-muted)]">
          {t("Hiện tại")}
          <select value={cur} onChange={(e) => setCur(Number(e.target.value))} className={field}>
            <option value={0}>{t("Mất gốc")}</option>
            {BANDS.map((b) => (
              <option key={b} value={b}>{b.toFixed(1)}</option>
            ))}
          </select>
        </label>
        <label className="text-[11.5px] text-[var(--w-muted)]">
          {t("Mục tiêu")}
          <select value={target} onChange={(e) => setTarget(Number(e.target.value))} className={field}>
            {BANDS.map((b) => (
              <option key={b} value={b}>{b.toFixed(1)}</option>
            ))}
          </select>
        </label>
        <label className="text-[11.5px] text-[var(--w-muted)]">
          {t("Ngày thi")}
          <input type="date" value={exam} onChange={(e) => setExam(e.target.value)} className={field} />
        </label>
      </div>
      <button
        type="button"
        onClick={async () => {
          setError("");
          try {
            setP((await api.pathway({ current: cur, target, examDate: exam || undefined })).pathway);
          } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
          }
        }}
        className="min-h-10 w-full rounded-lg bg-[var(--w-primary)] text-[13px] font-semibold text-[var(--w-on-primary)]"
      >
        {t("Xem lộ trình")}
      </button>
      {error && <p className="text-[12px] text-rose-700">{error}</p>}
      {p && <PathwayCard p={p} onLead={() => setLead(true)} />}
      {p && lead && <LeadForm api={api} h={h} ctx={{ band: cur, target, examDate: exam || undefined, pathway: p }} onDone={() => undefined} />}
      <p className="text-[11.5px] text-[var(--w-muted)]">
        Chưa chắc band hiện tại?{" "}
        <button type="button" onClick={() => h.openPanel("test", { target })} className="font-medium text-[var(--w-primary)] underline">
          {t("Làm test 15 câu")}
        </button>
      </p>
    </div>
  );
}

function PathwayExtra({ p, h }: { p: PathwayView; h: ExtHelpers }) {
  const api = useMemo(() => educationApi(h.tenant, h.visitorId), [h.tenant, h.visitorId]);
  const [lead, setLead] = useState(false);
  return (
    <div className="space-y-2">
      <PathwayCard p={p} onLead={() => setLead(true)} />
      {lead && <LeadForm api={api} h={h} ctx={{ band: p.current, target: p.target, examDate: p.examDate ?? undefined, pathway: p }} onDone={() => undefined} />}
    </div>
  );
}

/** Widget bot IELTS: test xếp lớp trong chat, thẻ lộ trình, form lộ trình */
export const educationExtension: WidgetExtension = {
  fullScreenPanels: ["test"],

  renderCards(items, h) {
    return <ProductCards products={items as ProductCard[]} onAsk={(p) => h.send(`Cho mình biết thêm về khoá ${p.name}`)} onOpen={() => undefined} />;
  },

  renderExtras(extras, h) {
    const t = h.tr;
    const p = extras.pathway as PathwayView | undefined;
    const offer = extras.offerTest as string | undefined;
    return (
      <div className="space-y-2">
        {p && <PathwayExtra p={p} h={h} />}
        {offer && (
          <button type="button" onClick={() => h.openPanel("test", { target: Number(offer) > 1 ? Number(offer) : undefined })} className="min-h-10 w-full rounded-[var(--w-r-bubble)] border border-[var(--w-primary)] bg-[var(--w-surface)] px-3 text-[13px] font-semibold text-[var(--w-primary)]">
            {t("Làm test xếp lớp 15 câu (10 phút)")}
          </button>
        )}
      </div>
    );
  },

  quickActions(h) {
    const t = h.tr;
    return (
      <>
        <button type="button" onClick={() => h.openPanel("test")} className={`${btn} bg-[var(--w-primary)] text-[var(--w-on-primary)] hover:brightness-110`}>
          {t("Test trình độ miễn phí")}
        </button>
        <button type="button" onClick={() => h.openPanel("pathway")} className={`${btn} border border-[var(--w-border)] bg-[var(--w-surface)] text-[var(--w-fg)] hover:border-[var(--w-primary)]`}>
          {t("Lộ trình đến band mục tiêu")}
        </button>
      </>
    );
  },

  renderPanel(name, data, h) {
    if (name === "test") return <PlacementPanel h={h} initialTarget={(data as { target?: number } | undefined)?.target} />;
    if (name === "pathway") return <PathwayPanel h={h} />;
    return null;
  },
};
