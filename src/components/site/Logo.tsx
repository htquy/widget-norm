import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { siteConfig } from "@/lib/site";

// "WidgetNorm" → tô màu từ cuối của tên ghép (giống logo skill-pages)
const words = siteConfig.name.split(" ");
const head = words.slice(0, -1).join(" ");
const tail = words.at(-1) ?? "";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" aria-label={`${siteConfig.name} — trang chủ`} className={`group flex min-h-11 items-center gap-2 font-semibold tracking-tight ${className}`}>
      <span className="relative flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 via-violet-600 to-brand-700 text-white shadow-glow transition-transform duration-500 ease-spring group-hover:-rotate-6 group-hover:scale-105">
        <MessageCircle className="size-4" aria-hidden="true" />
        <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-spark-400 ring-2 ring-white" aria-hidden="true" />
      </span>
      <span className="text-base text-zinc-900 sm:text-lg">
        {head} <span className="text-brand-600">{tail}</span>
      </span>
    </Link>
  );
}
