"use client";

import { useT } from "@/lib/i18n/client";
import { useActionState, useMemo, useState } from "react";
import { saveThemeAction } from "@/app/admin/actions";
import type { PublicConfig as BaseConfig } from "@/application/use-cases/tenants";
import {
  FONT_STACKS,
  contrastRatio,
  textOn,
  type WidgetTheme,
} from "@/domain/theme";
import { ChatWidget, type PreviewData } from "@/components/widget/ChatWidget";
import { submitWith } from "./form";
import { Status } from "./LeadEditForm";
import { Card, Field, btnPrimary, fieldCls } from "./ui";

const PRESETS = [
  "#2563eb",
  "#be185d",
  "#059669",
  "#7c3aed",
  "#ea580c",
  "#0f172a",
  "#0891b2",
  "#ca8a04",
];

function Seg<T extends string>({
  name,
  value,
  onChange,
  options,
}: {
  name: string;
  value: T;
  onChange: (v: T) => void;
  options: { v: T; label: string }[];
}) {
  const t = useT();
  return (
    <div
      role="radiogroup"
      className="flex flex-wrap gap-1 rounded-lg border border-[var(--border)] bg-white p-0.5"
    >
      {options.map((o) => (
        <label
          key={o.v}
          className={`flex min-h-9 cursor-pointer items-center rounded-md px-3 text-[13px] ${value === o.v ? "bg-[var(--accent)] text-white" : "text-[var(--fg-muted)] hover:text-[var(--fg)]"}`}
        >
          <input
            type="radio"
            name={name}
            value={o.v}
            checked={value === o.v}
            onChange={() => onChange(o.v)}
            className="sr-only"
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

export function ThemeEditor({
  tenantSlug,
  initial,
  greeting,
  base,
}: {
  tenantSlug: string;
  initial: BaseConfig;
  greeting: string;
  base: string;
}) {
  const t = useT();
  const [th, setT] = useState<WidgetTheme>(initial.theme);
  const [greet, setGreet] = useState(greeting);
  const [state, action, pending] = useActionState(saveThemeAction, undefined);
  const set = <K extends keyof WidgetTheme>(k: K, v: WidgetTheme[K]) =>
    setT((x) => ({ ...x, [k]: v }));
  const fg = textOn(th);
  const ratio = /^#[0-9a-f]{6}$/i.test(th.primaryColor)
    ? contrastRatio(th.primaryColor, fg)
    : 0;

  const preview: PreviewData = useMemo(
    () => ({
      config: {
        ...initial,
        ext: { variant: "visualizer" },
        greeting: greet,
        theme: th,
      },
      messages: [
        {
          id: "p1",
          role: "user",
          text: t("Có quà tặng nào dưới 300.000đ không?"),
          at: "",
        },
        {
          id: "p2",
          role: "assistant",
          text: t("Bạn có thể tham khảo **Bình giữ nhiệt Everyday**. Có hộp quà, giá 249.000 ₫. Bạn muốn xem thông số hay đặt lịch ghé shop?"),
          at: "",
          products: [
            {
              id: "x",
              sku: "DEMO",
              name: t("Bình giữ nhiệt Everyday 500ml"),
              category: t("Quà tặng"),
              price: 249000,
              priceText: "249.000 ₫",
              imageUrl: "",
              url: "",
              inStock: true,
              summary: t("Ví dụ minh họa giao diện"),
            },
          ],
        },
        {
          id: "p3",
          role: "user",
          text: t("Đơn hàng hôm qua của mình giao tới đâu rồi?"),
          at: "",
        },
        {
          id: "p4",
          role: "assistant",
          text: t("Câu này mình cần nhân viên của shop hỗ trợ để trả lời chính xác."),
          at: "",
          action: { type: "handoff", reason: "not_in_data" },
        },
      ],
    }),
    [initial, th, greet],
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
      <form onSubmit={submitWith(action)} className="space-y-4">
        <Card title={t("Màu sắc & kiểu dáng")}>
          <div className="space-y-4">
            <Field label={t("Màu thương hiệu")}>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="color"
                  value={th.primaryColor}
                  onChange={(e) => set("primaryColor", e.target.value)}
                  aria-label={t("Chọn màu")}
                  className="h-10 w-14 cursor-pointer rounded-lg border border-[var(--border)]"
                />
                <input
                  name="primaryColor"
                  value={th.primaryColor}
                  onChange={(e) => set("primaryColor", e.target.value)}
                  className={`${fieldCls} w-32 font-mono`}
                />
                {PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set("primaryColor", c)}
                    aria-label={`Dùng màu ${c}`}
                    className="h-8 w-8 rounded-full ring-1 ring-black/10"
                    style={{ background: c }}
                  />
                ))}
              </div>
            </Field>
            <p
              className={`text-[13px] ${ratio >= 4.5 ? "text-[var(--success)]" : "text-amber-800"}`}
            >
              Chữ trên nút dùng màu {fg === "#ffffff" ? t("trắng") : t("đen")} · tương
              phản {ratio.toFixed(1)}:1{" "}
              {ratio >= 4.5
                ? t("— đạt chuẩn dễ đọc (AA)")
                : t("— hơi thấp, nên chọn màu đậm/nhạt hơn")}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("Màu chữ trên nền màu chính")}>
                <Seg
                  name="onPrimary"
                  value={th.onPrimary}
                  onChange={(v) => set("onPrimary", v)}
                  options={[
                    { v: "auto", label: t("Tự động") },
                    { v: "#ffffff", label: t("Trắng") },
                    { v: "#111111", label: t("Đen") },
                  ]}
                />
              </Field>
              <Field label={t("Chế độ sáng/tối")}>
                <Seg
                  name="colorScheme"
                  value={th.colorScheme}
                  onChange={(v) => set("colorScheme", v)}
                  options={[
                    { v: "light", label: t("Sáng") },
                    { v: "dark", label: t("Tối") },
                    { v: "auto", label: t("Theo máy khách") },
                  ]}
                />
              </Field>
              <Field label={t("Bo góc")}>
                <Seg
                  name="radius"
                  value={th.radius}
                  onChange={(v) => set("radius", v)}
                  options={[
                    { v: "sharp", label: t("Vuông") },
                    { v: "soft", label: t("Mềm") },
                    { v: "round", label: t("Tròn") },
                  ]}
                />
              </Field>
              <Field label={t("Phông chữ")}>
                <select
                  name="font"
                  value={th.font}
                  onChange={(e) =>
                    set("font", e.target.value as WidgetTheme["font"])
                  }
                  className={fieldCls}
                >
                  {Object.entries(FONT_STACKS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        </Card>

        <Card title={t("Nút mở chat")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("Vị trí")}>
              <Seg
                name="position"
                value={th.position}
                onChange={(v) => set("position", v)}
                options={[
                  { v: "right", label: t("Góc phải") },
                  { v: "left", label: t("Góc trái") },
                ]}
              />
            </Field>
            <Field label={t("Kiểu nút")}>
              <Seg
                name="launcherStyle"
                value={th.launcherStyle}
                onChange={(v) => set("launcherStyle", v)}
                options={[
                  { v: "pill", label: t("Nút có chữ") },
                  { v: "circle", label: t("Nút tròn") },
                ]}
              />
            </Field>
            <Field label={t("Chữ trên nút")}>
              <input
                name="launcherLabel"
                maxLength={40}
                value={th.launcherLabel}
                onChange={(e) => set("launcherLabel", e.target.value)}
                className={fieldCls}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("Cách lề ngang (px)")}>
                <input
                  name="offsetX"
                  type="number"
                  min={0}
                  max={120}
                  value={th.offsetX}
                  onChange={(e) => set("offsetX", Number(e.target.value))}
                  className={fieldCls}
                />
              </Field>
              <Field label={t("Cách đáy (px)")}>
                <input
                  name="offsetY"
                  type="number"
                  min={0}
                  max={120}
                  value={th.offsetY}
                  onChange={(e) => set("offsetY", Number(e.target.value))}
                  className={fieldCls}
                />
              </Field>
            </div>
            <Field
              label={t("Lời mời cạnh nút chat")}
              hint={t("Hiện sau 2,5 giây, khách có thể tắt. Để trống = không hiện.")}
              className="sm:col-span-2"
            >
              <input
                name="proactiveMessage"
                maxLength={140}
                value={th.proactiveMessage}
                onChange={(e) => set("proactiveMessage", e.target.value)}
                className={fieldCls}
              />
            </Field>
            <Field
              label={t("Tự mở khung chat sau (giây)")}
              hint={t("0 = tắt. Chỉ trên máy tính, 1 lần mỗi phiên.")}
            >
              <input
                name="autoOpenSeconds"
                type="number"
                min={0}
                max={120}
                value={th.autoOpenSeconds}
                onChange={(e) => set("autoOpenSeconds", Number(e.target.value))}
                className={fieldCls}
              />
            </Field>
          </div>
        </Card>

        <Card title={t("Trợ lý")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("Tên trợ lý")}>
              <input
                name="botName"
                maxLength={60}
                value={th.botName}
                onChange={(e) => set("botName", e.target.value)}
                className={fieldCls}
              />
            </Field>
            <Field label={t("Dòng phụ dưới tên")}>
              <input
                name="headerSubtitle"
                maxLength={80}
                value={th.headerSubtitle}
                onChange={(e) => set("headerSubtitle", e.target.value)}
                className={fieldCls}
              />
            </Field>
            <Field
              label={t("Ảnh đại diện (link https)")}
              hint={t("Trống = dùng chữ cái đầu của tên trợ lý")}
              className="sm:col-span-2"
            >
              <input
                name="avatarUrl"
                type="url"
                value={th.avatarUrl}
                onChange={(e) => set("avatarUrl", e.target.value)}
                placeholder="https://…"
                className={fieldCls}
              />
            </Field>
            <Field label={t("Lời chào đầu tiên")} className="sm:col-span-2">
              <textarea
                name="greeting"
                rows={2}
                maxLength={500}
                value={greet}
                onChange={(e) => setGreet(e.target.value)}
                className={fieldCls}
              />
            </Field>
            <label className="flex min-h-10 items-center gap-2 text-[14px]">
              <input
                type="checkbox"
                name="showBranding"
                checked={th.showBranding}
                onChange={(e) => set("showBranding", e.target.checked)}
                className="h-4 w-4"
              />{" "}
              Hiện dòng “Trợ lý AI · Widget Norm”
            </label>
          </div>
        </Card>

        <div className="sticky bottom-0 flex items-center gap-3 border-t border-[var(--border)] bg-[var(--bg)] py-3">
          <button disabled={pending} className={btnPrimary}>
            {pending ? t("Đang lưu…") : t("Lưu giao diện")}
          </button>
          <Status state={state} />
        </div>
      </form>

      <div className="xl:sticky xl:top-6 xl:self-start">
        <p className="mb-2 text-[13px] font-medium text-[var(--fg-muted)]">
          {t("Xem trước (cập nhật khi bạn chỉnh)")}
        </p>
        <div className="relative h-[680px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[repeating-linear-gradient(45deg,#eef0f3,#eef0f3_10px,#f6f7f9_10px,#f6f7f9_20px)]">
          <div
            className="absolute bottom-[84px] h-[520px] w-[360px] max-w-[calc(100%-24px)] overflow-hidden shadow-2xl"
            style={
              {
                [th.position]: 12,
                borderRadius: { sharp: 6, soft: 14, round: 22 }[th.radius],
              } as React.CSSProperties
            }
          >
            <ChatWidget tenant={tenantSlug} preview={preview} />
          </div>
          <div
            className="absolute bottom-3 flex items-center gap-2 font-semibold shadow-lg"
            style={{
              [th.position]: 12,
              background: th.primaryColor,
              color: fg,
              borderRadius: 999,
              ...(th.launcherStyle === "circle"
                ? { width: 60, height: 60, justifyContent: "center" }
                : { minHeight: 52, padding: "0 22px 0 18px", fontSize: 15 }),
            }}
            aria-hidden="true"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {th.launcherStyle === "pill" && th.launcherLabel}
          </div>
        </div>
        <p className="mt-2 text-[12.5px] text-[var(--fg-muted)]">
          Xem trên trang thật:{" "}
          <a
            href={`${base}/embed/${tenantSlug}`}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            {t("mở khung chat toàn màn hình")}
          </a>
        </p>
      </div>
    </div>
  );
}
