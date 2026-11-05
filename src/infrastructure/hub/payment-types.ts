export interface HubPrice {
  id: string;
  label: string;
  amount: number;
  currency: string;
  months: number;
}
export interface HubPayment {
  ticket: string;
  orderCode: string;
  amount: number;
  currency: string;
  expiresAt: string;
  qrDataUrl: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  description: string;
}
export type CheckoutState =
  { error?: string; payment?: HubPayment } | undefined;
export type PaymentStatus =
  "PENDING" | "PAID" | "EXPIRED" | "CANCELED" | "FAILED" | "REFUNDED";
