import {
  ArrowRight,
  Bot,
  BookOpenCheck,
  CalendarCheck,
  Calculator,
  ChartNoAxesCombined,
  FlaskConical,
  Grid3x3,
  Headset,
  LayoutGrid,
  Palette,
  ScanEye,
  Search,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  ArrowRight,
  Bot,
  BookOpenCheck,
  CalendarCheck,
  Calculator,
  ChartNoAxesCombined,
  FlaskConical,
  Grid3x3,
  Headset,
  LayoutGrid,
  Palette,
  ScanEye,
  Search,
  ShoppingBag,
};

/** Icon theo tên lucide (tên lưu trong meta của bot). Tên lạ → icon Bot. */
export function Icon({ name, className = "size-5" }: { name: string; className?: string }) {
  const C = ICONS[name] ?? Bot;
  return <C className={className} aria-hidden="true" />;
}
