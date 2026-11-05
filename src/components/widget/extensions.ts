"use client";

import type { BotKind } from "@/domain/tenant";
import { tileExtension } from "@/bots/tile/widget/extension";
import type { WidgetExtension } from "./extension";

/** Phần mở rộng widget theo loại bot. Bot "store" dùng thẻ sản phẩm mặc định nên không cần extension. */
export function extensionFor(kind: BotKind | string): WidgetExtension | null {
  if (kind === "tile") return tileExtension;
  return null;
}
