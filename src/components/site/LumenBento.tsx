"use client";

import { useT } from "@/lib/i18n/client";
import { useState, useEffect } from "react";
import {
  Activity,
  Cpu,
  Layers,
  Terminal,
  BarChart3,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export function LumenBento() {
  const t = useT();
  const [latency, setLatency] = useState(38);

  useEffect(() => {
    const timer = setInterval(() => {
      // Subtle realistic jitter between 34ms and 42ms
      setLatency(34 + Math.floor(Math.random() * 9));
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="grid gap-4 md:grid-cols-6">
      {/* 1. LATENCY & THROUGHPUT (Span 4) */}
      <div className="md:col-span-4 relative overflow-hidden rounded-3xl border border-white/10 bg-[#0d0f15] p-6 sm:p-8 shadow-2xl flex flex-col justify-between group hover:border-brand-400/30 transition-all">
        {/* Glow ambient */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-brand-600/15 blur-3xl"
        />

        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                <Activity className="size-3.5 text-brand-400" />
                {t("Thời gian phản hồi p50 trung bình")}
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white font-mono">
                  {latency}
                  <small className="text-base text-white/50 font-normal ml-1">
                    ms
                  </small>
                </span>
                <span className="text-xs text-white/40">
                  {t("(Cận dưới < 0.8 giây cho toàn bộ phép tính)")}
                </span>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{t("Toàn bộ 4 chatbot trực tuyến")}</span>
            </div>
          </div>

          {/* SVG Sparkline Chart */}
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] items-end my-4">
            <div className="h-28 w-full">
              <svg
                viewBox="0 0 400 100"
                preserveAspectRatio="none"
                className="h-full w-full"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="lumenSparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5f45e4" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#5f45e4" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Area */}
                <path
                  d="M0,75 Q30,65 60,70 T120,40 T180,55 T240,30 T300,45 T360,25 T400,32 L400,100 L0,100 Z"
                  fill="url(#lumenSparkGrad)"
                />
                {/* Line */}
                <path
                  d="M0,75 Q30,65 60,70 T120,40 T180,55 T240,30 T300,45 T360,25 T400,32"
                  fill="none"
                  stroke="#7c3aed"
                  strokeWidth="2.5"
                  vectorEffect="non-scaling-stroke"
                />
                {/* Live dot */}
                <circle cx="400" cy="32" r="4" fill="#a78bfa" />
              </svg>
            </div>

            {/* Breakdown per operation */}
            <ul className="space-y-2 text-xs font-mono">
              {[
                { label: t("Tra cứu giá & tồn kho shop"), val: "12 ms", pct: "30%" },
                { label: t("Tính m² gạch & keo ron"), val: "18 ms", pct: "45%" },
                { label: t("Kiểm tra giờ đặt lịch trống"), val: "22 ms", pct: "55%" },
                { label: t("Phân tích band điểm IELTS"), val: "20 ms", pct: "50%" },
              ].map((item) => (
                <li key={item.label} className="flex flex-col gap-1">
                  <div className="flex justify-between text-white/70">
                    <span className="truncate">{item.label}</span>
                    <span className="text-white/40">{item.val}</span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-400"
                      style={{ width: item.pct }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-4 border-t border-white/5 mt-2">
          <h3 className="text-lg font-bold text-white">
            {t("Phản hồi tức thì dưới 1 giây trên mọi thiết bị")}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-white/60">
            {t("Khách hàng truy cập từ 4G điện thoại hay máy tính đều nhận được câu trả lời mượt mà, không giật lag, giữ chân khách hàng ngay khi họ có nhu cầu mua sắm.")}
          </p>
        </div>
      </div>

      {/* 2. ACCURACY RING / JEV ENGINE (Span 2) */}
      <div className="md:col-span-2 relative overflow-hidden rounded-3xl border border-white/10 bg-[#0d0f15] p-6 sm:p-7 shadow-2xl flex flex-col justify-between group hover:border-brand-400/30 transition-all">
        <div className="flex justify-center my-3">
          <div className="relative size-36">
            <svg viewBox="0 0 160 160" className="size-full -rotate-90" aria-hidden="true">
              <circle
                cx="80"
                cy="80"
                r="68"
                fill="none"
                stroke="rgba(255, 255, 255, 0.06)"
                strokeWidth="10"
              />
              <circle
                cx="80"
                cy="80"
                r="68"
                fill="none"
                stroke="url(#lumenRingGrad)"
                strokeWidth="10"
                strokeDasharray="427"
                strokeDashoffset="8"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="lumenRingGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" />
                  <stop offset="100%" stopColor="#5f45e4" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black tracking-tight text-white font-mono">
                99.9%
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                {t("Độ chính xác")}
              </span>
            </div>
          </div>
        </div>

        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 mb-2">
            <ShieldCheck className="size-3.5" /> {t("0% Bịa đặt thông tin")}
          </span>
          <h3 className="text-base font-bold text-white">
            {t("Kiểm duyệt chéo bằng Jev Engine")}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-white/60">
            {t("Đối chiếu trực tiếp với database của cửa hàng trước khi xuất câu trả lời. Khi gặp trường hợp chưa chắc chắn, bot tự động kích hoạt handoff chuyển nhân viên tư vấn.")}
          </p>
        </div>
      </div>

      {/* 3. DECISION ROUTER (Span 2) */}
      <div className="md:col-span-2 relative overflow-hidden rounded-3xl border border-white/10 bg-[#0d0f15] p-6 sm:p-7 shadow-2xl flex flex-col justify-between group hover:border-brand-400/30 transition-all">
        {/* Router Flow Diagram */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3 my-2">
          <svg viewBox="0 0 280 140" className="w-full h-auto" aria-hidden="true">
            {/* Input node */}
            <rect x="10" y="55" width="60" height="30" rx="8" fill="#181a24" stroke="rgba(255,255,255,0.15)" />
            <text x="40" y="74" fill="#fff" fontSize="10" textAnchor="middle" fontWeight="bold">{t("Khách hỏi")}</text>

            {/* Central hub (Jev) */}
            <rect x="110" y="45" width="60" height="50" rx="10" fill="#2d1b54" stroke="#7c3aed" strokeWidth="1.5" />
            <text x="140" y="70" fill="#fff" fontSize="11" textAnchor="middle" fontWeight="bold">Jev Router</text>
            <text x="140" y="83" fill="#a78bfa" fontSize="8" textAnchor="middle">{t("Phân luồng")}</text>

            {/* Output nodes */}
            <rect x="210" y="15" width="60" height="26" rx="6" fill="#181a24" stroke="rgba(255,255,255,0.1)" />
            <text x="240" y="32" fill="#a1a1aa" fontSize="9" textAnchor="middle">{t("Kho hàng")}</text>

            <rect x="210" y="57" width="60" height="26" rx="6" fill="#181a24" stroke="rgba(255,255,255,0.1)" />
            <text x="240" y="74" fill="#a1a1aa" fontSize="9" textAnchor="middle">{t("Công cụ ngành")}</text>

            <rect x="210" y="99" width="60" height="26" rx="6" fill="#181a24" stroke="rgba(255,255,255,0.1)" />
            <text x="240" y="116" fill="#a1a1aa" fontSize="9" textAnchor="middle">Live Chat</text>

            {/* Connecting wires */}
            <path d="M70,70 L110,70" stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
            <path d="M170,70 C190,70 190,28 210,28" fill="none" stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
            <path d="M170,70 L210,70" fill="none" stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
            <path d="M170,70 C190,70 190,112 210,112" fill="none" stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />

            {/* Animated packet dot */}
            <circle cx="90" cy="70" r="3" fill="#ff6a2b" className="animate-pulse" />
          </svg>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-brand-400 uppercase tracking-wider block mb-1">
            {t("Điều hướng thông minh")}
          </span>
          <h3 className="text-base font-bold text-white">
            {t("Bộ định tuyến đa kênh Jev")}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-white/60">
            {t("Tự động nhận diện ý định khách hàng: câu hỏi cơ bản bot trả lời ngay, câu tính toán chuyển sang domain nghiệp vụ, câu hỏi nhạy cảm giao cho nhân viên.")}
          </p>
        </div>
      </div>

      {/* 4. DEPLOY IN 1 COMMAND / EMBED (Span 2) */}
      <div className="md:col-span-2 relative overflow-hidden rounded-3xl border border-white/10 bg-[#0d0f15] p-6 sm:p-7 shadow-2xl flex flex-col justify-between group hover:border-brand-400/30 transition-all">
        {/* Terminal panel */}
        <div className="rounded-2xl border border-white/5 bg-black/60 p-3.5 my-2 font-mono text-[11px] text-white/80">
          <div className="flex items-center gap-1.5 mb-2.5">
            <span className="size-2 rounded-full bg-rose-500/80" />
            <span className="size-2 rounded-full bg-amber-500/80" />
            <span className="size-2 rounded-full bg-emerald-500/80" />
            <span className="ml-2 text-[10px] text-white/40">embed-script.html</span>
          </div>
          <div className="space-y-1 text-white/60 leading-relaxed overflow-x-auto">
            <p>
              <span className="text-violet-400">&lt;script</span>{" "}
              <span className="text-amber-300">src</span>=
              <span className="text-emerald-300">&quot;https://cdn.widgetnorm.vn/v2.js&quot;</span>
            </p>
            <p className="pl-3">
              <span className="text-amber-300">data-bot</span>=
              <span className="text-emerald-300">&quot;avi-store&quot;</span>{" "}
              <span className="text-amber-300">defer</span>
              <span className="text-violet-400">&gt;&lt;/script&gt;</span>
              <span className="inline-block w-1.5 h-3 bg-brand-400 align-middle ml-1 animate-pulse" />
            </p>
          </div>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
            {t("Không cần lập trình viên")}
          </span>
          <h3 className="text-base font-bold text-white">
            {t("Nhúng chỉ 1 dòng mã duy nhất")}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-white/60">
            {t("Dán một dòng mã JavaScript vào bất kỳ nền tảng nào: WordPress, Haravan, Sapo, Shopify, LadiPage hay web tự code. Hoạt động tức thì.")}
          </p>
        </div>
      </div>

      {/* 5. AUTOSCALE CONCURRENCY BARS (Span 2) */}
      <div className="md:col-span-2 relative overflow-hidden rounded-3xl border border-white/10 bg-[#0d0f15] p-6 sm:p-7 shadow-2xl flex flex-col justify-between group hover:border-brand-400/30 transition-all">
        {/* Dynamic audio/traffic bars */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 my-2">
          <div className="flex items-end justify-between gap-1.5 h-20 px-1">
            {[40, 65, 85, 50, 95, 70, 80, 60, 90, 75, 88, 55, 92, 68].map(
              (h, i) => (
                <div
                  key={i}
                  className={`w-full rounded-xs transition-all ${
                    i % 3 === 0
                      ? "bg-gradient-to-t from-brand-600 to-spark-400"
                      : "bg-gradient-to-t from-white/10 to-white/30"
                  }`}
                  style={{
                    height: `${h}%`,
                    animation: `lumen-bar 2.4s ease-in-out infinite alternate`,
                    animationDelay: `${i * 120}ms`,
                  }}
                />
              )
            )}
          </div>
          <div className="flex justify-between text-[10px] text-white/50 font-mono mt-3 pt-2 border-t border-white/5">
            <span>{t("Đồng thời: 120+ chats")}</span>
            <span className="text-emerald-400">{t("Peak Load: 0s chờ")}</span>
          </div>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-spark-400 uppercase tracking-wider block mb-1">
            {t("Chịu tải cao điểm")}
          </span>
          <h3 className="text-base font-bold text-white">
            {t("Tự động co giãn theo truy cập")}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-white/60">
            {t("Dù là nửa đêm hay ngày Flash Sale hàng nghìn khách cùng vào website, mọi khách hàng đều được chào đón và phục vụ tức thì không cần xếp hàng.")}
          </p>
        </div>
      </div>
    </div>
  );
}
