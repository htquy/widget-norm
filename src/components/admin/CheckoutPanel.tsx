"use client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createPaymentAction,
  paymentStatusAction,
} from "@/app/admin/payment-actions";
import type {
  HubPrice,
  PaymentStatus,
} from "@/infrastructure/hub/payment-types";
import { btnPrimary, fieldCls } from "./ui";

export function CheckoutPanel({ prices }: { prices: HubPrice[] }) {
  const [state, action, pending] = useActionState(
    createPaymentAction,
    undefined,
  );
  const [status, setStatus] = useState<PaymentStatus>("PENDING");
  const [error, setError] = useState("");
  const router = useRouter();
  const ticket = state?.payment?.ticket;
  useEffect(() => {
    if (!ticket) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    setStatus("PENDING");
    setError("");
    const check = async () => {
      try {
        const result = await paymentStatusAction(ticket);
        if (stopped) return;
        setError(result.error ?? "");
        if (result.status) setStatus(result.status);
        if (result.status === "PAID") {
          router.refresh();
          return;
        }
        if (result.status && result.status !== "PENDING") return;
      } catch {
        if (!stopped) setError("Mất kết nối, đang thử kiểm tra lại.");
      }
      if (!stopped) timer = setTimeout(check, 4000);
    };
    timer = setTimeout(check, 2000);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [ticket, router]);
  return (
    <div className="space-y-4">
      <form action={action} className="space-y-3">
        <label className="block text-sm font-medium" htmlFor="hub-price">
          Gói thanh toán
        </label>
        <select
          id="hub-price"
          name="priceId"
          className={fieldCls}
          required
          disabled={!prices.length || pending}
        >
          {prices.map((price) => (
            <option key={price.id} value={price.id}>
              {price.label} — {price.amount.toLocaleString("vi-VN")}{" "}
              {price.currency === "VND" ? "₫" : price.currency}
            </option>
          ))}
        </select>
        <button
          disabled={pending || !prices.length}
          className={`${btnPrimary} w-full`}
        >
          {pending ? "Đang tạo mã thanh toán…" : "Tạo mã QR thanh toán"}
        </button>
        {!prices.length && (
          <p className="text-sm text-amber-900">Chưa có gói đang mở bán.</p>
        )}
        {state?.error && (
          <p role="alert" className="text-sm text-rose-700">
            {state.error}
          </p>
        )}
      </form>
      {state?.payment && (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-sm font-semibold">Đơn {state.payment.orderCode}</p>
          <p className="mt-2 text-2xl font-bold">
            {state.payment.amount.toLocaleString("vi-VN")}{" "}
            {state.payment.currency === "VND" ? "₫" : state.payment.currency}
          </p>
          {status === "PENDING" && (
            <>
              <img
                src={state.payment.qrDataUrl}
                alt={`Mã QR thanh toán đơn ${state.payment.orderCode}`}
                width={240}
                height={240}
                className="mx-auto my-4 rounded-xl bg-white"
              />
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-zinc-500">Ngân hàng / số tài khoản</dt>
                  <dd className="break-all font-medium">
                    {state.payment.bankName} · {state.payment.accountNumber}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Chủ tài khoản</dt>
                  <dd>{state.payment.accountHolder}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Nội dung chuyển khoản</dt>
                  <dd className="break-all font-mono font-semibold">
                    {state.payment.description}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-zinc-500">
                Hệ thống tự kiểm tra thanh toán và kích hoạt bot khi trung tâm
                xác nhận. Giữ đúng số tiền và nội dung chuyển khoản.
              </p>
            </>
          )}
          <p
            role="status"
            className={`mt-3 text-sm font-semibold ${status === "PAID" ? "text-emerald-800" : "text-zinc-700"}`}
          >
            {
              {
                PENDING: "Đang chờ thanh toán",
                PAID: "Đã thanh toán và kích hoạt chatbot",
                EXPIRED: "Đơn đã hết hạn. Tạo mã mới để thanh toán.",
                CANCELED: "Đơn đã bị hủy",
                FAILED: "Thanh toán chưa thành công",
                REFUNDED: "Đơn đã hoàn tiền",
              }[status]
            }
          </p>
          {error && (
            <p role="alert" className="mt-2 text-sm text-amber-900">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
