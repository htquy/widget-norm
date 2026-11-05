"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/infrastructure/auth/session";
import { app } from "@/infrastructure/container";
import {
  beginHubCheckout,
  pollHubPayment,
} from "@/infrastructure/hub/payments";
import { DomainError } from "@/domain/errors";
import type {
  CheckoutState,
  PaymentStatus,
} from "@/infrastructure/hub/payment-types";

export async function createPaymentAction(
  _: CheckoutState,
  form: FormData,
): Promise<CheckoutState> {
  const session = await requireSession();
  try {
    const tenant = await (await app()).tenants.byId(session.tenantId);
    if (!tenant || tenant.accountId !== session.accountId)
      throw new DomainError("FORBIDDEN", "Không có quyền với chatbot này.");
    const price = z.string().min(1).max(100).parse(form.get("priceId"));
    return {
      payment: await beginHubCheckout(
        session.accountId,
        tenant.id,
        tenant.kind,
        price,
      ),
    };
  } catch (error) {
    return {
      error:
        error instanceof DomainError
          ? error.message
          : "Không tạo được yêu cầu thanh toán. Vui lòng thử lại.",
    };
  }
}

export async function paymentStatusAction(
  ticket: string,
): Promise<{ status?: PaymentStatus; error?: string }> {
  const session = await requireSession();
  try {
    const status = await pollHubPayment(
      session.accountId,
      session.tenantId,
      z.string().max(10000).parse(ticket),
    );
    if (status === "PAID") revalidatePath("/admin/billing");
    return { status };
  } catch (error) {
    return {
      error:
        error instanceof DomainError
          ? error.message
          : "Chưa kiểm tra được thanh toán. Hệ thống sẽ thử lại.",
    };
  }
}
