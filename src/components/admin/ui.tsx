import Link from "next/link";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[22px] font-semibold text-[var(--fg)]">{title}</h1>
        {subtitle && <p className="mt-1 text-[14px] text-[var(--fg-muted)]">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Card({ title, children, className = "", right, id }: { title?: string; children: React.ReactNode; className?: string; right?: React.ReactNode; id?: string }) {
  return (
    <section id={id} className={`rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 ${className}`}>
      {(title || right) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-[15px] font-semibold text-[var(--fg)]">{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-[13px] text-[var(--fg-muted)]">{label}</p>
      <p className="mt-1 text-[22px] font-semibold tabular-nums text-[var(--fg)]">{value}</p>
      {sub && <p className="mt-0.5 text-[12.5px] text-[var(--fg-muted)]">{sub}</p>}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg bg-[var(--surface-2)] px-4 py-6 text-center text-[14px] text-[var(--fg-muted)]">{children}</p>;
}

export { RangeTabs } from "./RangeTabs";

export function parseDays(v: string | undefined): number {
  const n = Number(v);
  return [7, 30, 90].includes(n) ? n : 30;
}

export function rangeFor(days: number) {
  const to = new Date();
  const from = new Date(to.getTime() - (days - 1) * 86_400_000);
  from.setUTCHours(-7, 0, 0, 0); // 00:00 giờ VN
  return { from, to };
}

export const fmtDateTime = (d: Date) => new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(d);
export const fmtTime = (d: Date) => new Intl.DateTimeFormat("vi-VN", { timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(d);
export const fmtDay = (d: Date) => new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "numeric", month: "numeric", timeZone: "Asia/Ho_Chi_Minh" }).format(d);
export const pct = (n: number) => `${(n * 100).toFixed(1).replace(".", ",")}%`;
export const num = (n: number) => n.toLocaleString("vi-VN");

/** Màu trạng thái: luôn kèm chữ, không truyền nghĩa chỉ bằng màu */
export const TONE: Record<string, string> = {
  blue: "bg-blue-50 text-blue-800 ring-blue-200",
  amber: "bg-amber-50 text-amber-900 ring-amber-200",
  violet: "bg-violet-50 text-violet-800 ring-violet-200",
  green: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  gray: "bg-neutral-100 text-neutral-700 ring-neutral-200",
  red: "bg-red-50 text-red-800 ring-red-200",
};

export function Badge({ tone = "gray", children }: { tone?: keyof typeof TONE | string; children: React.ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-medium ring-1 ${TONE[tone] ?? TONE.gray}`}>{children}</span>;
}

export const LEAD_TONE: Record<string, string> = { new: "blue", contacted: "amber", qualified: "violet", won: "green", lost: "gray" };
export const BOOKING_TONE: Record<string, string> = { pending: "amber", confirmed: "blue", done: "green", cancelled: "gray", no_show: "red" };

export const fieldCls = "w-full min-h-10 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-[14px] text-[var(--fg)] placeholder:text-neutral-400 focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20";
export const btnPrimary = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-[14px] font-medium text-[var(--accent-fg)] shadow-xs transition hover:bg-brand-700 disabled:opacity-60";
export const btnSecondary = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-white px-4 text-[14px] font-medium text-[var(--fg)] transition hover:bg-[var(--surface-2)] disabled:opacity-60";

export function Field({ label, hint, children, className = "" }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block text-[14px] ${className}`}>
      <span className="mb-1 block font-medium text-[var(--fg)]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[12.5px] leading-snug text-[var(--fg-muted)]">{hint}</span>}
    </label>
  );
}
