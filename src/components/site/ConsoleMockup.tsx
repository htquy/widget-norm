import { getT } from "@/lib/i18n/server";
import {
  Activity,
  Bot,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Headset,
  Layers,
  MessageSquare,
  Package,
  Search,
  Sparkles,
  TrendingUp,
  Users,
  ShieldCheck,
  Lock,
} from "lucide-react";

export async function ConsoleMockup() {
  const { t } = await getT();
  return (
    <div className="relative mx-auto max-w-6xl">
      {/* Background radial glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 rounded-full bg-brand-600/15 blur-[100px]"
      />

      {/* Main console window */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0a0c11] shadow-[0_0_0_1px_rgba(0,0,0,0.8),0_40px_100px_-30px_rgba(0,0,0,0.9),0_0_80px_-20px_rgba(95,69,228,0.25)]">
        {/* Top browser bar */}
        <div className="flex items-center justify-between border-b border-white/5 bg-[#0d1016] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-rose-500/80" />
            <span className="size-2.5 rounded-full bg-amber-500/80" />
            <span className="size-2.5 rounded-full bg-emerald-500/80" />
          </div>

          <div className="flex items-center gap-1.5 rounded-md bg-white/[0.04] px-4 py-1 text-xs text-white/50 font-mono">
            <Lock className="size-3 text-emerald-400" />
            <span>https://widgetnorm.vn/workspace/live</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-mono text-emerald-400 hidden sm:inline">
              LIVE STREAM
            </span>
          </div>
        </div>

        {/* Dashboard Body */}
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] min-h-[500px]">
          {/* Left Sidebar */}
          <div className="hidden lg:flex flex-col justify-between border-r border-white/5 bg-[#08090d] p-4 text-xs">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 px-2 py-1">
                <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 text-white font-bold text-xs shadow-md">
                  WN
                </span>
                <div>
                  <p className="font-semibold text-white">{t("Hub Cửa Hàng")}</p>
                  <p className="text-[10px] text-white/40">{t("Gói Pro · 4 Chatbot")}</p>
                </div>
              </div>

              <div className="space-y-1">
                <span className="px-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">
                  {t("Điều hướng")}
                </span>
                {[
                  { icon: Activity, label: t("Tổng quan live"), active: true },
                  { icon: MessageSquare, label: t("Hội thoại khách"), badge: "14" },
                  { icon: Users, label: t("Khách tiềm năng"), badge: "+8" },
                  { icon: CalendarCheck, label: t("Lịch hẹn dịch vụ"), badge: "4" },
                  { icon: Package, label: t("Danh mục sản phẩm") },
                  { icon: Headset, label: t("Chuyển nhân viên") },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className={`flex items-center justify-between rounded-xl px-2.5 py-2 font-medium transition-colors ${
                        item.active
                          ? "bg-white/10 text-white"
                          : "text-white/50 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="size-4" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="rounded-full bg-brand-500/20 px-1.5 py-0.2 text-[10px] font-bold text-brand-300">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-[11px] text-white/60">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-1">
                <ShieldCheck className="size-3.5" />
                <span>Jev Engine Active</span>
              </div>
              <p className="text-[10px] text-white/40">
                {t("0% ảo giác · Tra cứu DB thời gian thực")}
              </p>
            </div>
          </div>

          {/* Main Dashboard Panel */}
          <div className="p-5 sm:p-7 space-y-6 bg-[#0a0c11]">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  {t("Trực quan hóa hội thoại theo thời gian thực")}
                </h3>
                <p className="text-xs text-white/50">
                  {t("Toàn bộ lượt tương tác từ website được bot tự động giải quyết và phân loại")}
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-1 text-xs">
                <span className="rounded-lg bg-white/10 px-3 py-1 font-semibold text-white">
                  {t("Hôm nay")}
                </span>
                <span className="px-3 py-1 text-white/40">{t("7 ngày")}</span>
                <span className="px-3 py-1 text-white/40">{t("30 ngày")}</span>
              </div>
            </div>

            {/* 4 Quick KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: t("Hội thoại hôm nay"), val: "148", change: t("+24% so hôm qua"), good: true },
                { label: t("SĐT / Lead thu về"), val: "42", change: t("Tỷ lệ 68% xin số"), good: true },
                { label: t("Lịch hẹn đã chốt"), val: "19", change: t("Khách tự chọn giờ"), good: true },
                { label: t("Bỏ lỡ ngoài giờ"), val: "0", change: t("AI trực 24/7"), good: true },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-2xl border border-white/5 bg-white/[0.02] p-4"
                >
                  <span className="text-xs text-white/40">{kpi.label}</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
                      {kpi.val}
                    </span>
                  </div>
                  <span className="mt-1 block text-[11px] text-emerald-400 font-medium">
                    {kpi.change}
                  </span>
                </div>
              ))}
            </div>

            {/* Live Message Activity Feed */}
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/5 px-4 py-3 text-xs font-semibold text-white/60">
                <span>{t("Dòng hội thoại đang diễn ra")}</span>
                <span className="text-emerald-400 font-mono flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
                  {t("Đang đồng bộ")}
                </span>
              </div>

              <div className="divide-y divide-white/5 text-xs">
                {[
                  {
                    bot: t("AVI Gạch"),
                    botColor: "text-[#38bdf8] bg-sky-500/10",
                    user: t("Khách vãng lai #8491"),
                    msg: t("Phòng khách 25m2 gạch 80x80 hết bao nhiêu tiền?"),
                    reply: t("Hết 39 thùng (gồm 5% hao hụt) + 4 bao keo. Báo giá: 13.650.000 ₫"),
                    status: t("Đã lưu SĐT + Báo giá"),
                    statusColor: "text-emerald-400 bg-emerald-500/10",
                    time: t("1 phút trước"),
                  },
                  {
                    bot: t("Nội Thất"),
                    botColor: "text-amber-400 bg-amber-500/10",
                    user: t("Khách vãng lai #8492"),
                    msg: t("Sofa Milan 280x160cm có kê vừa phòng khách 3m x 2.5m không?"),
                    reply: t("Kê vừa vặn, còn lối đi 90cm. Bot gửi link đặt lịch đo đạc tại nhà."),
                    status: t("Đã chốt lịch đo đạc"),
                    statusColor: "text-emerald-400 bg-emerald-500/10",
                    time: t("4 phút trước"),
                  },
                  {
                    bot: t("AVI Bán Lẻ"),
                    botColor: "text-violet-400 bg-violet-500/10",
                    user: t("Khách vãng lai #8493"),
                    msg: t("Shop còn bình giữ nhiệt Everyday màu đen không?"),
                    reply: t("Còn 8 chiếc tại kho, giá 249.000 ₫ có hộp quà tặng."),
                    status: t("Khách bấm xem giỏ hàng"),
                    statusColor: "text-brand-300 bg-brand-500/10",
                    time: t("9 phút trước"),
                  },
                ].map((row, i) => (
                  <div key={i} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors">
                    <div className="space-y-1 max-w-xl">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${row.botColor}`}>
                          {row.bot}
                        </span>
                        <span className="text-white/40">{row.user}</span>
                        <span className="text-white/30 text-[10px]">· {row.time}</span>
                      </div>
                      <p className="text-white/80 font-medium">{row.msg}</p>
                      <p className="text-white/50 text-[11px] leading-relaxed">
                        ↳ <span className="text-white/70">{row.reply}</span>
                      </p>
                    </div>

                    <div className="shrink-0">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${row.statusColor}`}>
                        <CheckCircle2 className="size-3" />
                        {row.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating glass notification pills (Lumen Signature!) */}
      <div className="hidden lg:flex items-center gap-3 absolute -bottom-6 -left-6 z-20 rounded-2xl border border-white/10 bg-[#12151c]/90 p-3.5 shadow-2xl backdrop-blur-xl">
        <span className="grid size-9 place-items-center rounded-xl bg-emerald-500/20 text-emerald-400">
          <CheckCircle2 className="size-5" />
        </span>
        <div>
          <p className="text-xs font-bold text-white">{t("Tự động báo giá & chốt SĐT")}</p>
          <p className="text-[11px] text-white/50">{t("Phòng 25m² gạch → 39 thùng (Có hao hụt & keo)")}</p>
        </div>
      </div>

      <div className="hidden lg:flex items-center gap-3 absolute -top-6 -right-6 z-20 rounded-2xl border border-white/10 bg-[#12151c]/90 p-3.5 shadow-2xl backdrop-blur-xl">
        <span className="grid size-9 place-items-center rounded-xl bg-brand-500/20 text-brand-400">
          <CalendarCheck className="size-5" />
        </span>
        <div>
          <p className="text-xs font-bold text-white">{t("Lịch hẹn dịch vụ mới")}</p>
          <p className="text-[11px] text-white/50">{t("15h30 Chiều nay · Khảo sát & đo đạc tại nhà")}</p>
        </div>
      </div>
    </div>
  );
}
