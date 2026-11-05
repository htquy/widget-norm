import "server-only";
import { z } from "zod";
import { BOT_PRICING } from "@/domain/bot-pricing";
import { DomainError } from "@/domain/errors";
import type { BotKind } from "@/domain/tenant";
import { hubAccessToken, hubFetch, seal, unseal } from "./client";
import { activateLicense } from "./billing";
import type { HubPrice, HubPayment, PaymentStatus } from "./payment-types";

const appSlug = (kind: BotKind) =>
  process.env[kind === "tile" ? "HUB_APP_TILE" : "HUB_APP_AVI"] ||
  BOT_PRICING[kind].hubSlug;
const catalog = z.object({
  data: z.object({
    app: z.object({ slug: z.string() }),
    plans: z.array(
      z.object({
        name: z.string(),
        isActive: z.boolean(),
        prices: z.array(
          z.object({
            id: z.string().min(1),
            amount: z.number().int().nonnegative(),
            months: z.number().int().nonnegative(),
            currency: z.string(),
            isActive: z.boolean(),
          }),
        ),
      }),
    ),
  }),
});
const orderResponse = z.object({
  order: z.object({
    id: z.string().min(1),
    orderCode: z.string().min(1),
    amount: z.number().int().nonnegative(),
    currency: z.string(),
    expiresAt: z.string(),
    status: z.literal("PENDING"),
  }),
});
const qrResponse = z.object({
  // The hub's legacy VietQR provider may fall back to its HTTPS image URL.
  qrDataUrl: z
    .string()
    .max(300000)
    .refine(
      (value) =>
        /^data:image\/(?:png|jpe?g|webp);base64,/.test(value) ||
        /^https:\/\/(?:img|api)\.vietqr\.io\//.test(value),
      "Mã QR không phải ảnh thanh toán hợp lệ",
    ),
  bankName: z.string(),
  accountNumber: z.string(),
  accountHolder: z.string(),
  description: z.string(),
});

export async function listHubPrices(kind: BotKind): Promise<HubPrice[]> {
  const slug = appSlug(kind);
  const { data } = catalog.parse(
    await hubFetch(`/api/apps/${encodeURIComponent(slug)}`),
  );
  if (data.app.slug !== slug)
    throw new DomainError(
      "BAD_CATALOG",
      "Danh mục gói không khớp loại chatbot.",
    );
  return data.plans
    .filter((p) => p.isActive)
    .flatMap((plan) =>
      plan.prices
        .filter((price) => price.isActive)
        .map((price) => ({
          ...price,
          label: `${plan.name} · ${price.months ? `${price.months} tháng` : "Trọn đời"}`,
        })),
    );
}

export async function beginHubCheckout(
  accountId: string,
  tenantId: string,
  kind: BotKind,
  priceId: string,
): Promise<HubPayment> {
  if (!(await listHubPrices(kind)).some((price) => price.id === priceId))
    throw new DomainError(
      "BAD_PRICE",
      "Gói không thuộc chatbot này hoặc đã ngừng bán.",
    );
  const token = await hubAccessToken(accountId);
  if (!token)
    throw new DomainError("HUB_LOGIN", "Đăng nhập SSO để thanh toán.");
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const { order } = orderResponse.parse(
    await hubFetch("/api/orders", {
      method: "POST",
      headers,
      body: JSON.stringify({ planPriceId: priceId }),
    }),
  );
  const payment = qrResponse.parse(
    await hubFetch(`/api/orders/${encodeURIComponent(order.id)}/payment`, {
      method: "POST",
      headers,
    }),
  );
  return {
    ...payment,
    orderCode: order.orderCode,
    amount: order.amount,
    currency: order.currency,
    expiresAt: order.expiresAt,
    ticket: await seal({ orderId: order.id, accountId, tenantId, kind }, "1h"),
  };
}

export async function pollHubPayment(
  accountId: string,
  tenantId: string,
  ticket: string,
): Promise<PaymentStatus> {
  const saved = z
    .object({
      orderId: z.string(),
      accountId: z.literal(accountId),
      tenantId: z.literal(tenantId),
      kind: z.enum(["store", "tile"]),
    })
    .parse(await unseal(ticket));
  const token = await hubAccessToken(accountId);
  if (!token)
    throw new DomainError("HUB_LOGIN", "Đăng nhập SSO để kiểm tra thanh toán.");
  const { status } = z
    .object({
      status: z.enum([
        "PENDING",
        "PAID",
        "EXPIRED",
        "CANCELED",
        "FAILED",
        "REFUNDED",
      ]),
    })
    .parse(
      await hubFetch(
        `/api/orders/${encodeURIComponent(saved.orderId)}/status`,
        { headers: { Authorization: `Bearer ${token}` } },
      ),
    );
  if (status === "PAID") await activateLicense(accountId, saved.kind, tenantId);
  return status;
}
