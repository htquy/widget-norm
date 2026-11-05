import { domainToASCII } from "node:url";
import { isIP } from "node:net";
import { DomainError } from "./errors";

export function normalizeDomain(input: string): string {
  try {
    const value = input.trim();
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    const host = domainToASCII(
      url.hostname
        .toLowerCase()
        .replace(/\.$/, "")
        .replace(/^www\./, ""),
    );
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.port ||
      isIP(host) ||
      host.length > 253 ||
      !host.includes(".") ||
      host.endsWith(".localhost") ||
      host.endsWith(".local") ||
      !host
        .split(".")
        .every((part) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(part))
    )
      throw new Error();
    return host;
  } catch {
    throw new DomainError(
      "BAD_DOMAIN",
      "Nhập domain công khai hợp lệ, ví dụ cuahang.vn (không dùng IP hoặc cổng riêng).",
    );
  }
}
