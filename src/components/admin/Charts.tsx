"use client";

import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Bảng màu phân loại cố định (đã kiểm tra mù màu): xanh, cam, ngọc, tím.
export const S1 = "#2a78d6";
export const S2 = "#eb6834";
export const S3 = "#1baf7a";
export const S4 = "#8b5cf6";
const GRID = "#e7e5e4";
const AXIS = "#52514e";

const shortDay = (d: string) => `${Number(d.slice(8, 10))}/${Number(d.slice(5, 7))}`;
const tooltipStyle = { borderRadius: 8, border: "1px solid #e7e5e4", fontSize: 13 };

export function DailyLines({ data, series }: { data: Record<string, number | string>[]; series: { key: string; name: string; color: string }[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="day" tickFormatter={shortDay} tick={{ fill: AXIS, fontSize: 12 }} axisLine={{ stroke: GRID }} tickLine={false} minTickGap={16} />
          <YAxis allowDecimals={false} tick={{ fill: AXIS, fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => `Ngày ${shortDay(String(l))}`} />
          <Legend iconType="plainline" wrapperStyle={{ fontSize: 13, color: AXIS }} />
          {series.map((s) => (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DailyBars({ data, series, stacked }: { data: Record<string, number | string>[]; series: { key: string; name: string; color: string }[]; stacked?: boolean }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }} barCategoryGap={2}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="day" tickFormatter={shortDay} tick={{ fill: AXIS, fontSize: 12 }} axisLine={{ stroke: GRID }} tickLine={false} minTickGap={16} />
          <YAxis allowDecimals={false} tick={{ fill: AXIS, fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => `Ngày ${shortDay(String(l))}`} cursor={{ fill: "#f5f5f4" }} />
          <Legend wrapperStyle={{ fontSize: 13, color: AXIS }} />
          {series.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} stackId={stacked ? "a" : undefined} radius={stacked && i < series.length - 1 ? 0 : [3, 3, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function FunnelChart({ data }: { data: { label: string; visitors: number }[] }) {
  const max = Math.max(1, data[0]?.visitors ?? 1);
  return (
    <ol className="space-y-2.5">
      {data.map((s, i) => {
        const prev = i > 0 ? data[i - 1].visitors : 0;
        const step = i > 0 && prev ? s.visitors / prev : null;
        return (
          <li key={s.label}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-[13px]">
              <span className="text-neutral-800">{s.label}</span>
              <span className="tabular-nums text-neutral-900">
                {s.visitors.toLocaleString("vi-VN")}
                {step !== null && <span className="ml-2 text-neutral-500">{(step * 100).toFixed(0)}% bước trước</span>}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-neutral-100" aria-hidden="true">
              <div className="h-2.5 rounded-full" style={{ width: `${(s.visitors / max) * 100}%`, background: S1 }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Danh sách thanh ngang có nhãn + số (đọc được kể cả khi không thấy màu) */
export function BarList({ data, color = S1, suffix }: { data: { label: string; value: number; note?: string }[]; color?: string; suffix?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  return (
    <ul className="space-y-2">
      {data.map((d) => (
        <li key={d.label}>
          <div className="mb-0.5 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="min-w-0 truncate text-neutral-800" title={d.label}>
              {d.label}
            </span>
            <span className="shrink-0 tabular-nums text-neutral-900">
              {d.value.toLocaleString("vi-VN")}
              {suffix}
              <span className="ml-1.5 text-neutral-500">{Math.round((d.value / total) * 100)}%</span>
              {d.note && <span className="ml-1.5 text-neutral-500">· {d.note}</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-neutral-100" aria-hidden="true">
            <div className="h-2 rounded-full" style={{ width: `${(d.value / max) * 100}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
