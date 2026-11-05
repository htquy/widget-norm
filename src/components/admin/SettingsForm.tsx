"use client";

import { useActionState } from "react";
import { saveSettingsAction } from "@/app/admin/actions";
import { WEEKDAY_LABELS, type Weekday } from "@/domain/booking";
import { MAX_KNOWLEDGE_LENGTH, type TenantSettings } from "@/domain/tenant";
import { submitWith } from "./form";
import { Status } from "./LeadEditForm";
import { Card, Field, btnPrimary, fieldCls } from "./ui";

const ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

export function SettingsForm({ settings: s }: { settings: TenantSettings }) {
  const [state, action, pending] = useActionState(saveSettingsAction, undefined);
  return (
    <form onSubmit={submitWith(action)} className="space-y-4">
      <Card title="Cửa hàng">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tên cửa hàng">
            <input name="shopName" required defaultValue={s.shopName} className={fieldCls} />
          </Field>
          <Field label="Lĩnh vực kinh doanh" hint="Giúp bot hiểu bối cảnh, vd: mỹ phẩm & spa, nội thất, phòng khám nha khoa">
            <input name="industry" defaultValue={s.industry} className={fieldCls} />
          </Field>
          <Field label="Hotline">
            <input name="phone" defaultValue={s.phone} className={fieldCls} />
          </Field>
          <Field label="Email">
            <input name="email" type="email" defaultValue={s.email} className={fieldCls} />
          </Field>
          <Field label="Địa chỉ" className="sm:col-span-2">
            <input name="address" defaultValue={s.address} className={fieldCls} />
          </Field>
        </div>
      </Card>

      <Card title="Giờ mở cửa">
        <p className="mb-3 text-[13px] text-[var(--fg-muted)]">Dùng cho khung giờ đặt lịch, trạng thái “Đang hoạt động” và câu trả lời ngoài giờ khi chuyển nhân viên.</p>
        <fieldset className="space-y-2">
          <legend className="sr-only">Giờ mở cửa theo ngày</legend>
          {ORDER.map((d) => {
            const h = s.hours[d];
            return (
              <div key={d} className="flex flex-wrap items-center gap-3">
                <label className="flex min-h-10 w-32 items-center gap-2 text-[14px]">
                  <input type="checkbox" name={`open_${d}`} defaultChecked={!!h} className="h-4 w-4" /> {WEEKDAY_LABELS[d]}
                </label>
                <label className="text-[13px]">
                  <span className="sr-only">Mở cửa {WEEKDAY_LABELS[d]}</span>
                  <input type="time" name={`from_${d}`} defaultValue={h?.open ?? "08:00"} className={`${fieldCls} w-32`} />
                </label>
                <span aria-hidden="true">–</span>
                <label className="text-[13px]">
                  <span className="sr-only">Đóng cửa {WEEKDAY_LABELS[d]}</span>
                  <input type="time" name={`to_${d}`} defaultValue={h?.close ?? "20:00"} className={`${fieldCls} w-32`} />
                </label>
              </div>
            );
          })}
        </fieldset>
      </Card>

      <Card title="Đặt lịch">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex min-h-10 items-center gap-2 text-[14px] sm:col-span-3">
            <input type="checkbox" name="bookingEnabled" defaultChecked={s.booking.enabled} className="h-4 w-4" /> Cho khách đặt lịch qua chat
          </label>
          <Field label="Bước giữa các khung giờ (phút)">
            <input name="slotStepMin" type="number" min={5} max={240} defaultValue={s.booking.slotStepMin} className={fieldCls} />
          </Field>
          <Field label="Số khách tối đa cùng lúc" hint="Số nhân viên / phòng phục vụ song song">
            <input name="capacity" type="number" min={1} max={100} defaultValue={s.booking.capacity} className={fieldCls} />
          </Field>
          <Field label="Đặt trước tối thiểu (phút)">
            <input name="minLeadMin" type="number" min={0} defaultValue={s.booking.minLeadMin} className={fieldCls} />
          </Field>
          <Field label="Cho đặt xa nhất (ngày)">
            <input name="maxDaysAhead" type="number" min={1} max={365} defaultValue={s.booking.maxDaysAhead} className={fieldCls} />
          </Field>
          <Field label="Ngày nghỉ đặc biệt" hint="Mỗi ngày dạng YYYY-MM-DD, cách nhau bằng dấu phẩy" className="sm:col-span-2">
            <input name="closedDates" defaultValue={s.booking.closedDates.join(", ")} placeholder="2026-12-31, 2027-01-01" className={fieldCls} />
          </Field>
          <label className="flex min-h-10 items-center gap-2 text-[14px] sm:col-span-3">
            <input type="checkbox" name="requireConfirm" defaultChecked={s.booking.requireConfirm} className="h-4 w-4" /> Lịch mới cần shop xác nhận (bỏ chọn = tự xác nhận)
          </label>
        </div>
      </Card>

      <Card title="Chuyển nhân viên khi bot gặp câu khó">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex min-h-10 items-center gap-2 text-[14px]">
            <input type="checkbox" name="handoffEnabled" defaultChecked={s.handoff.enabled} className="h-4 w-4" /> Bật gợi ý liên hệ nhân viên
          </label>
          <label className="flex min-h-10 items-center gap-2 text-[14px]">
            <input type="checkbox" name="liveChat" defaultChecked={s.handoff.liveChat} className="h-4 w-4" /> Nhân viên trả lời trực tiếp trong widget
          </label>
          <Field label="Tự đề nghị gặp nhân viên sau N lượt bot chưa giải quyết được">
            <input name="escalateAfter" type="number" min={1} max={10} defaultValue={s.handoff.escalateAfter} className={fieldCls} />
          </Field>
          <div />
          <Field label="Link Zalo" hint="https://zalo.me/… — trống = ẩn nút">
            <input name="zaloUrl" type="url" defaultValue={s.handoff.zaloUrl} className={fieldCls} />
          </Field>
          <Field label="Link Messenger" hint="https://m.me/… — trống = ẩn nút">
            <input name="messengerUrl" type="url" defaultValue={s.handoff.messengerUrl} className={fieldCls} />
          </Field>
        </div>
        <p className="mt-3 text-[13px] text-[var(--fg-muted)]">
          Tầng quyết định chuyển nhân viên khi: khách đòi gặp người, phàn nàn, hỏi ngoài dữ liệu (đơn hàng, công nợ…), bot nhiều lần không giải quyết được, hoặc khách bực bội liên tiếp.
        </p>
      </Card>

      <Card title="Bot trả lời" id="knowledge">
        <div className="space-y-4">
          <Field label="Lời chào">
            <textarea name="greeting" rows={2} defaultValue={s.greeting} className={fieldCls} />
          </Field>
          <Field label="Câu gợi ý nhanh" hint="Mỗi dòng một câu (tối đa 6). Câu chứa “đặt lịch” sẽ mở thẳng form đặt lịch.">
            <textarea name="quickReplies" rows={4} defaultValue={s.quickReplies.join("\n")} className={fieldCls} />
          </Field>
          <Field label="Hướng dẫn thêm cho bot" hint="Giọng điệu, khuyến mãi đang chạy, điều cần hỏi khách trước khi tư vấn…">
            <textarea name="botInstructions" rows={4} defaultValue={s.botInstructions} className={fieldCls} />
          </Field>
          <Field label="Kiến thức cửa hàng (FAQ, chính sách)" hint={`Giao hàng, đổi trả, bảo hành, thanh toán, thành viên… Bot chỉ trả lời câu ngoài danh mục dựa trên phần này. Mục “Phân tích nhu cầu” liệt kê câu bot chưa trả lời được để bổ sung. Tối đa ${MAX_KNOWLEDGE_LENGTH.toLocaleString("vi-VN")} ký tự.`}>
            <textarea name="knowledgeBase" rows={12} maxLength={MAX_KNOWLEDGE_LENGTH} defaultValue={s.knowledgeBase} className={`${fieldCls} font-mono text-[13px]`} />
          </Field>
        </div>
      </Card>

      <Card title="Thông báo & bảo mật">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Webhook thông báo" hint="URL https:// (Zalo bot, Slack, Google Chat, n8n, Make…). Nhận JSON {kind: lead|booking|handoff, text, …}.">
            <input name="webhookUrl" type="url" defaultValue={s.webhookUrl} placeholder="https://…" className={fieldCls} />
          </Field>
          <Field label="Website được phép nhúng" hint="Mỗi dòng một origin, vd https://shop.vn. Trống = mọi nơi.">
            <textarea name="allowedOrigins" rows={2} defaultValue={s.allowedOrigins.join("\n")} className={fieldCls} />
          </Field>
        </div>
      </Card>

      <div className="sticky bottom-0 flex items-center gap-3 border-t border-[var(--border)] bg-[var(--bg)] py-3">
        <button disabled={pending} className={btnPrimary}>
          {pending ? "Đang lưu…" : "Lưu cài đặt"}
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}
