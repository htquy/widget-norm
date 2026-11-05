"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const I = ({ d }: { d: string }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: string;
}

const COMMON_TOP: NavItem[] = [
  {
    href: "/admin",
    label: "Tổng quan",
    icon: "M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z",
  },
  {
    href: "/admin/conversations",
    label: "Hội thoại",
    icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
    badge: "handoff",
  },
  {
    href: "/admin/insights",
    label: "Phân tích nhu cầu",
    icon: "M3 3v18h18M7 15l4-4 3 3 5-6",
  },
  {
    href: "/admin/bookings",
    label: "Lịch hẹn",
    icon: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  },
  {
    href: "/admin/leads",
    label: "Khách tiềm năng",
    icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  },
];

const COMMON_BOTTOM: NavItem[] = [
  {
    href: "/admin/playground",
    label: "Thử chatbot",
    icon: "M9 3h6M10 3v7L4 20h16l-6-10V3M8 16h8",
  },
  {
    href: "/admin/billing",
    label: "Domain & thanh toán",
    icon: "M2 5h20v14H2zM2 10h20M6 15h3",
  },
  {
    href: "/admin/widget",
    label: "Giao diện widget",
    icon: "M12 2a10 10 0 1 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4A5.6 5.6 0 0 0 22 10c0-4.4-4.5-8-10-8zM6.5 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM9.5 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM14.5 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
  },
  {
    href: "/admin/settings",
    label: "Cài đặt & mã nhúng",
    icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-2.82-1.17l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 3 15.4H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 2.82 1.17l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  },
];

export function NavLinks({
  openHandoffs,
  botItems,
}: {
  openHandoffs: number;
  botItems: { href: string; label: string; icon: string }[];
}) {
  const path = usePathname();
  const LINKS: NavItem[] = [
    ...COMMON_TOP,
    ...botItems,
    {
      href: "/admin/services",
      label: "Dịch vụ đặt lịch",
      icon: "M12 8v4l3 3M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z",
    },
    ...COMMON_BOTTOM,
  ];
  return (
    <nav
      aria-label="Điều hướng quản trị"
      className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col"
    >
      {LINKS.map((l) => {
        const active =
          l.href === "/admin" ? path === "/admin" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-10 shrink-0 items-center gap-2.5 rounded-lg px-3 text-[14px] font-medium transition ${active ? "bg-[var(--fg)] text-white" : "text-[var(--fg-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)]"}`}
          >
            <span className={active ? "text-white" : "text-neutral-500"}>
              <I d={l.icon} />
            </span>
            <span className="flex-1">{l.label}</span>
            {l.badge && openHandoffs > 0 && (
              <span
                className="rounded-full bg-red-600 px-1.5 text-[12px] font-semibold text-white"
                aria-label={`${openHandoffs} hội thoại cần hỗ trợ`}
              >
                {openHandoffs}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
