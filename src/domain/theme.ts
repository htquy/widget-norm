/** Giao diện widget — shop tự chỉnh ở Admin → Giao diện widget, áp dụng ngay không cần đổi mã nhúng. */
export interface WidgetTheme {
  primaryColor: string;
  /** Màu chữ trên nền màu chính — tự tính nếu "auto" */
  onPrimary: "auto" | "#ffffff" | "#111111";
  position: "right" | "left";
  launcherStyle: "pill" | "circle";
  launcherLabel: string;
  /** Độ bo góc khung chat + bong bóng */
  radius: "sharp" | "soft" | "round";
  colorScheme: "light" | "dark" | "auto";
  botName: string;
  headerSubtitle: string;
  /** URL ảnh đại diện (https). Trống = chữ cái đầu tên shop */
  avatarUrl: string;
  font: "system" | "be-vietnam" | "inter" | "nunito";
  /** Tự mở khung chat sau N giây (0 = tắt) */
  autoOpenSeconds: number;
  /** Bong bóng gợi ý cạnh nút chat (trống = tắt) */
  proactiveMessage: string;
  showBranding: boolean;
  /** Khoảng cách tới mép màn hình (px) */
  offsetX: number;
  offsetY: number;
}

export const FONT_STACKS: Record<WidgetTheme["font"], { label: string; css: string; google?: string }> = {
  system: { label: "Mặc định hệ thống", css: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` },
  "be-vietnam": { label: "Be Vietnam Pro", css: `"Be Vietnam Pro", system-ui, sans-serif`, google: "Be+Vietnam+Pro:wght@400;500;600;700" },
  inter: { label: "Inter", css: `"Inter", system-ui, sans-serif`, google: "Inter:wght@400;500;600;700" },
  nunito: { label: "Nunito", css: `"Nunito", system-ui, sans-serif`, google: "Nunito:wght@400;600;700" },
};

export const RADIUS_PX: Record<WidgetTheme["radius"], { frame: number; bubble: number; control: number }> = {
  sharp: { frame: 4, bubble: 6, control: 4 },
  soft: { frame: 12, bubble: 14, control: 10 },
  round: { frame: 20, bubble: 20, control: 999 },
};

export const defaultTheme = (shopName: string): WidgetTheme => ({
  primaryColor: "#2563eb",
  onPrimary: "auto",
  position: "right",
  launcherStyle: "pill",
  launcherLabel: "Chat với chúng tôi",
  radius: "soft",
  colorScheme: "light",
  botName: `Trợ lý ${shopName}`,
  headerSubtitle: "Thường trả lời ngay",
  avatarUrl: "",
  font: "be-vietnam",
  autoOpenSeconds: 0,
  proactiveMessage: "",
  showBranding: true,
  offsetX: 20,
  offsetY: 20,
});

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Độ sáng tương đối (WCAG) của màu #RRGGBB */
export function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

export function contrastRatio(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Màu chữ trên nền màu chính: chọn trắng/đen theo tương phản cao hơn (đảm bảo ≥ 4.5:1 khi có thể). */
export function textOn(theme: Pick<WidgetTheme, "primaryColor" | "onPrimary">): string {
  if (theme.onPrimary !== "auto") return theme.onPrimary;
  return contrastRatio(theme.primaryColor, "#ffffff") >= contrastRatio(theme.primaryColor, "#111111") ? "#ffffff" : "#111111";
}

/** Chuẩn hoá theme từ dữ liệu bất kỳ (form admin, DB cũ thiếu trường) — luôn trả về theme hợp lệ. */
export function sanitizeTheme(raw: Partial<Record<keyof WidgetTheme, unknown>> | undefined, shopName: string): WidgetTheme {
  const d = defaultTheme(shopName);
  const r = raw ?? {};
  const pick = <K extends keyof WidgetTheme>(k: K, allowed: readonly WidgetTheme[K][]): WidgetTheme[K] =>
    allowed.includes(r[k] as WidgetTheme[K]) ? (r[k] as WidgetTheme[K]) : d[k];
  const str = (k: keyof WidgetTheme, max: number) => (typeof r[k] === "string" ? (r[k] as string).trim().slice(0, max) : (d[k] as string));
  const num = (k: keyof WidgetTheme, min: number, max: number) => {
    const n = Number(r[k]);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : (d[k] as number);
  };
  const avatar = str("avatarUrl", 500);
  return {
    primaryColor: typeof r.primaryColor === "string" && HEX.test(r.primaryColor) ? r.primaryColor.toLowerCase() : d.primaryColor,
    onPrimary: pick("onPrimary", ["auto", "#ffffff", "#111111"]),
    position: pick("position", ["right", "left"]),
    launcherStyle: pick("launcherStyle", ["pill", "circle"]),
    launcherLabel: str("launcherLabel", 40) || d.launcherLabel,
    radius: pick("radius", ["sharp", "soft", "round"]),
    colorScheme: pick("colorScheme", ["light", "dark", "auto"]),
    botName: str("botName", 60) || d.botName,
    headerSubtitle: str("headerSubtitle", 80),
    avatarUrl: /^https:\/\//.test(avatar) || avatar.startsWith("/") ? avatar : "",
    font: pick("font", ["system", "be-vietnam", "inter", "nunito"]),
    autoOpenSeconds: num("autoOpenSeconds", 0, 120),
    proactiveMessage: str("proactiveMessage", 140),
    showBranding: typeof r.showBranding === "boolean" ? r.showBranding : d.showBranding,
    offsetX: num("offsetX", 0, 120),
    offsetY: num("offsetY", 0, 120),
  };
}
