import { getT } from "@/lib/i18n/server";
export async function LogoMarquee() {
  const { t } = await getT();
  const logos = [
    { name: "WordPress", desc: t("Plugin & Script nhúng") },
    { name: "WooCommerce", desc: t("Đồng bộ đơn & kho") },
    { name: "Haravan", desc: t("Tích hợp 1 chạm") },
    { name: "Sapo Web", desc: t("Tương thích 100% theme") },
    { name: "Shopify", desc: t("theme.liquid nhúng nhanh") },
    { name: "LadiPage", desc: t("Mã chuyển đổi landing") },
    { name: "React / Next.js", desc: "Component / Hook SDK" },
    { name: t("Website riêng"), desc: "HTML5 / PHP / Laravel" },
  ];

  return (
    <div className="relative w-full overflow-hidden py-4">
      {/* Masked edges for smooth fade */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#07080b] to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#07080b] to-transparent"
      />

      <div className="flex w-max gap-8 animate-[marquee_35s_linear_infinite] hover:[animation-play-state:paused]">
        {/* Double array for seamless loop */}
        {[...logos, ...logos].map((p, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 shadow-sm transition-all hover:border-brand-400/40 hover:bg-white/[0.06]"
          >
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <p className="text-xs font-bold text-white whitespace-nowrap">
                {p.name}
              </p>
              <p className="text-[10px] text-white/40 whitespace-nowrap">
                {p.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
