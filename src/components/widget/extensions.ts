"use client";

import type { BotKind } from "@/domain/tenant";
import { tileExtension } from "@/bots/tile/widget/extension";
import { furnitureExtension } from "@/bots/furniture/widget/extension";
import { educationExtension } from "@/bots/education/widget/extension";
import type { WidgetExtension } from "./extension";

/** Phần mở rộng widget theo loại bot. Bot "store" dùng thẻ sản phẩm mặc định nên không cần extension. */
export function extensionFor(kind: BotKind | string): WidgetExtension | null {
  if (kind === "tile") return tileExtension;
  if (kind === "furniture") return furnitureExtension;
  if (kind === "education") return educationExtension;
  return null;
}
