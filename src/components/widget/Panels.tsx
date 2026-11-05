"use client";

import { useEffect, useState } from "react";
import { rememberContact, type ProductCard, type ServiceItem, type Slot, type WidgetApi } from "./api";

const fmtVnd = (n: number) => (n > 0 ? `${n.toLocaleString("vi-VN")} ₫` : "Miễn phí / liên hệ");
const WD = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export const inputCls =
  "w-full min-h-11 rounded-[var(--w-r-control)] border border-[var(--w-border)] bg-[var(--w-surface)] px-3 py-2 text-[15px] text-[var(--w-fg)] outline-none placeholder:text-[var(--w-muted)] focus:border-[var(--w-primary)] focus:ring-2 focus:ring-[var(--w-primary)]/25";
export const primaryBtn =
  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--w-r-control)] bg-[var(--w-primary)] px-4 text-[15px] font-semibold text-[var(--w-on-primary)] transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50";

export function PanelShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="flex max-h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-[var(--w-border)] px-4 py-3">
        <h2 className="text-[16px] font-semibold text-[var(--w-fg)]">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Đóng" className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--w-muted)] hover:bg-[var(--w-surface-2)]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
    </div>
  );
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[13px] font-medium text-[var(--w-fg)]">{label}</span>
      {children}
      {error && <span className="mt-1 block text-[13px] text-red-600">{error}</span>}
    </label>
  );
}

/* ---------------- Đặt lịch ---------------- */

const foldWords = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 2 && !["dat", "lich", "hen", "cho", "toi", "minh"].includes(w));

/** Chọn sẵn dịch vụ khớp câu khách vừa bấm (vd "Đặt lịch soi da miễn phí" → "Soi da & tư vấn…") */
function guessService(services: ServiceItem[], hint?: string): string | undefined {
  if (!hint) return undefined;
  const want = foldWords(hint);
  let best: { id: string; s: number } | undefined;
  for (const sv of services) {
    const have = new Set(foldWords(sv.name));
    const s = want.filter((w) => have.has(w)).length;
    if (s > 0 && (!best || s > best.s)) best = { id: sv.id, s };
  }
  return best?.id;
}

export function BookingPanel(props: { api: WidgetApi; conversationId: string | null; initialServiceId?: string; hint?: string; onClose: () => void; onDone: (summary: string) => void }) {
  const { api } = props;
  const [services, setServices] = useState<ServiceItem[] | null>(null);
  const [serviceId, setServiceId] = useState(props.initialServiceId ?? "");
  const [days, setDays] = useState<{ date: string; slots: number }[]>([]);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [time, setTime] = useState("");
  const saved = rememberContact();
  const [name, setName] = useState(saved.name);
  const [phone, setPhone] = useState(saved.phone);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .services()
      .then((r) => {
        setServices(r.services);
        if (!serviceId) {
          const guess = r.services.length === 1 ? r.services[0].id : guessService(r.services, props.hint);
          if (guess) setServiceId(guess);
        }
      })
      .catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  useEffect(() => {
    if (!serviceId) return;
    setDays([]);
    setDate("");
    setSlots(null);
    setTime("");
    api
      .days(serviceId)
      .then((r) => {
        setDays(r.days);
        const first = r.days.find((d) => d.slots > 0);
        if (first) setDate(first.date);
      })
      .catch((e) => setError(e.message));
  }, [api, serviceId]);

  useEffect(() => {
    if (!serviceId || !date) return;
    setSlots(null);
    setTime("");
    api
      .slots(serviceId, date)
      .then((r) => setSlots(r.slots))
      .catch((e) => setError(e.message));
  }, [api, serviceId, date]);

  const service = services?.find((s) => s.id === serviceId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!service || !date || !time) return setError("Chọn dịch vụ, ngày và giờ");
    setBusy(true);
    setError("");
    try {
      const r = await api.book({ conversationId: props.conversationId, serviceId, date, time, name, phone, note });
      rememberContact({ name, phone });
      const d = new Date(`${date}T00:00:00Z`);
      props.onDone(
        `Đã ${r.booking.status === "confirmed" ? "xác nhận" : "ghi nhận"} lịch ${service.name} lúc ${time} ngày ${d.getUTCDate()}/${d.getUTCMonth() + 1}. ${r.booking.status === "confirmed" ? "Hẹn gặp bạn nhé!" : "Shop sẽ gọi xác nhận sớm."}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
      if (err instanceof Error && /giờ/.test(err.message)) api.slots(serviceId, date).then((r) => setSlots(r.slots));
    } finally {
      setBusy(false);
    }
  }

  return (
    <PanelShell title="Đặt lịch hẹn" onClose={props.onClose}>
      <form onSubmit={submit} className="space-y-4">
        <fieldset>
          <legend className="mb-2 text-[13px] font-medium text-[var(--w-fg)]">1. Dịch vụ</legend>
          {!services ? (
            <p className="text-[14px] text-[var(--w-muted)]">Đang tải…</p>
          ) : services.length === 0 ? (
            <p className="text-[14px] text-[var(--w-muted)]">Shop chưa có dịch vụ đặt lịch.</p>
          ) : (
            <div className="space-y-2">
              {services.map((s) => (
                <label
                  key={s.id}
                  className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-[var(--w-r-control)] border p-3 transition ${s.id === serviceId ? "border-[var(--w-primary)] bg-[var(--w-primary)]/8" : "border-[var(--w-border)] hover:bg-[var(--w-surface-2)]"}`}
                >
                  <input type="radio" name="service" value={s.id} checked={s.id === serviceId} onChange={() => setServiceId(s.id)} className="mt-1 accent-[var(--w-primary)]" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold text-[var(--w-fg)]">{s.name}</span>
                    <span className="block text-[13px] text-[var(--w-muted)]">
                      {s.durationMin} phút · {fmtVnd(s.price)}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        {serviceId && (
          <fieldset>
            <legend className="mb-2 text-[13px] font-medium text-[var(--w-fg)]">2. Ngày</legend>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="radiogroup" aria-label="Chọn ngày">
              {days.length === 0 && <p className="text-[14px] text-[var(--w-muted)]">Đang tải…</p>}
              {days.map((d) => {
                const dt = new Date(`${d.date}T00:00:00Z`);
                const active = d.date === date;
                const disabled = d.slots === 0;
                return (
                  <button
                    key={d.date}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={disabled}
                    onClick={() => setDate(d.date)}
                    className={`flex min-h-14 w-14 shrink-0 flex-col items-center justify-center rounded-[var(--w-r-control)] border text-[13px] transition disabled:opacity-40 ${active ? "border-[var(--w-primary)] bg-[var(--w-primary)] text-[var(--w-on-primary)]" : "border-[var(--w-border)] text-[var(--w-fg)] hover:bg-[var(--w-surface-2)]"}`}
                  >
                    <span>{WD[dt.getUTCDay()]}</span>
                    <span className="text-[16px] font-semibold">{dt.getUTCDate()}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        {date && (
          <fieldset>
            <legend className="mb-2 text-[13px] font-medium text-[var(--w-fg)]">3. Giờ</legend>
            {!slots ? (
              <p className="text-[14px] text-[var(--w-muted)]">Đang tải…</p>
            ) : slots.length === 0 ? (
              <p className="text-[14px] text-[var(--w-muted)]">Ngày này đã kín lịch, bạn chọn ngày khác nhé.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Chọn giờ">
                {slots.map((s) => (
                  <button
                    key={s.time}
                    type="button"
                    role="radio"
                    aria-checked={s.time === time}
                    onClick={() => setTime(s.time)}
                    className={`min-h-11 rounded-[var(--w-r-control)] border text-[14px] font-medium tabular-nums transition ${s.time === time ? "border-[var(--w-primary)] bg-[var(--w-primary)] text-[var(--w-on-primary)]" : "border-[var(--w-border)] text-[var(--w-fg)] hover:bg-[var(--w-surface-2)]"}`}
                  >
                    {s.time}
                  </button>
                ))}
              </div>
            )}
          </fieldset>
        )}

        {time && (
          <fieldset className="space-y-3">
            <legend className="mb-2 text-[13px] font-medium text-[var(--w-fg)]">4. Thông tin liên hệ</legend>
            <Field label="Họ tên">
              <input required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={inputCls} />
            </Field>
            <Field label="Số điện thoại">
              <input required value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="0912 345 678" className={inputCls} />
            </Field>
            <Field label="Ghi chú (không bắt buộc)">
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} className={inputCls} />
            </Field>
          </fieldset>
        )}

        {error && (
          <p role="alert" className="rounded-[var(--w-r-control)] bg-red-50 px-3 py-2 text-[14px] text-red-700">
            {error}
          </p>
        )}
        <button disabled={busy || !time} className={primaryBtn}>
          {busy ? "Đang đặt…" : time ? `Xác nhận đặt lúc ${time}` : "Chọn giờ để đặt lịch"}
        </button>
      </form>
    </PanelShell>
  );
}

/* ---------------- Để lại liên hệ / xin gọi lại ---------------- */

export function ContactPanel(props: { mode: "lead" | "callback"; api: WidgetApi; conversationId: string | null; onClose: () => void; onDone: (text: string) => void }) {
  const saved = rememberContact();
  const [name, setName] = useState(saved.name);
  const [phone, setPhone] = useState(saved.phone);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const callback = props.mode === "callback";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (callback && props.conversationId) await props.api.callback({ conversationId: props.conversationId, name, phone, note });
      else await props.api.lead({ conversationId: props.conversationId, name, phone, email, note });
      rememberContact({ name, phone });
      props.onDone(callback ? "Mình đã chuyển yêu cầu cho nhân viên. Bạn sẽ được gọi lại sớm nhất có thể nhé!" : "Cảm ơn bạn! Nhân viên sẽ liên hệ lại sớm.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PanelShell title={callback ? "Nhân viên gọi lại cho bạn" : "Để lại thông tin liên hệ"} onClose={props.onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Họ tên">
          <input required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={inputCls} />
        </Field>
        <Field label="Số điện thoại">
          <input required value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="0912 345 678" className={inputCls} />
        </Field>
        {!callback && (
          <Field label="Email (không bắt buộc)">
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" className={inputCls} />
          </Field>
        )}
        <Field label={callback ? "Bạn cần hỗ trợ gì?" : "Nội dung cần tư vấn"}>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000} className={inputCls} />
        </Field>
        {error && (
          <p role="alert" className="rounded-[var(--w-r-control)] bg-red-50 px-3 py-2 text-[14px] text-red-700">
            {error}
          </p>
        )}
        <button disabled={busy} className={primaryBtn}>
          {busy ? "Đang gửi…" : callback ? "Yêu cầu gọi lại" : "Gửi thông tin"}
        </button>
        <p className="text-center text-[12px] text-[var(--w-muted)]">Thông tin chỉ dùng để shop liên hệ tư vấn cho bạn.</p>
      </form>
    </PanelShell>
  );
}

/* ---------------- Thẻ sản phẩm ---------------- */

export function ProductCards({ products, onAsk, onOpen }: { products: ProductCard[]; onAsk: (p: ProductCard) => void; onOpen: (p: ProductCard) => void }) {
  return (
    <ul className="-mx-1 flex snap-x gap-2.5 overflow-x-auto px-1 pb-1" aria-label="Sản phẩm gợi ý">
      {products.map((p) => (
        <li key={p.id} className="flex w-[200px] shrink-0 snap-start flex-col overflow-hidden rounded-[var(--w-r-bubble)] border border-[var(--w-border)] bg-[var(--w-surface)]">
          {p.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.imageUrl} alt={p.name} loading="lazy" className="aspect-[4/3] w-full object-cover" />
          ) : (
            <div className="flex aspect-[4/3] w-full items-center justify-center bg-[var(--w-surface-2)] text-[13px] font-medium text-[var(--w-muted)]" aria-hidden="true">
              {p.category || "Sản phẩm"}
            </div>
          )}
          <div className="flex flex-1 flex-col p-3">
            <p className="line-clamp-2 text-[14px] font-semibold leading-snug text-[var(--w-fg)]">{p.name}</p>
            <p className="mt-1 text-[14px] font-semibold tabular-nums text-[var(--w-primary)]">{p.priceText}</p>
            {!p.inStock && <p className="text-[12px] text-amber-700">Tạm hết hàng</p>}
            <div className="mt-auto flex gap-1.5 pt-2.5">
              <button type="button" onClick={() => onAsk(p)} className="min-h-10 flex-1 rounded-[var(--w-r-control)] border border-[var(--w-border)] text-[13px] font-medium text-[var(--w-fg)] hover:bg-[var(--w-surface-2)]">
                Hỏi thêm
              </button>
              {p.url && (
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => onOpen(p)}
                  className="flex min-h-10 flex-1 items-center justify-center rounded-[var(--w-r-control)] bg-[var(--w-primary)] text-[13px] font-semibold text-[var(--w-on-primary)]"
                >
                  Xem
                </a>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
