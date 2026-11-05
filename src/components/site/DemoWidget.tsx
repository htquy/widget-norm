"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, X } from "lucide-react";

/** One page-owned widget: navigating between bot pages also switches the demo tenant. */
export function DemoWidget({
  tenant,
  name,
  accent,
}: {
  tenant: string;
  name: string;
  accent: string;
}) {
  const [open, setOpen] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    launcher.current?.focus();
  };
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.origin === window.location.origin &&
        event.source === frame.current?.contentWindow &&
        event.data?.type === "wn:close"
      )
        close();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("message", receive);
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("message", receive);
      window.removeEventListener("keydown", escape);
    };
  }, []);
  return (
    <>
      <button
        ref={launcher}
        type="button"
        aria-label={`Chat thử ${name}`}
        aria-expanded={open}
        aria-controls="bot-demo-widget"
        onClick={() => setOpen((value) => !value)}
        className="fixed bottom-5 right-4 z-50 inline-flex min-h-14 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white shadow-xl transition hover:brightness-110 sm:right-6"
        style={{ background: accent }}
      >
        <MessageCircle className="size-5" />
        Chat thử {name}
      </button>
      <div
        id="bot-demo-widget"
        role="dialog"
        aria-label={`Dùng thử ${name}`}
        hidden={!open}
        className="fixed inset-0 z-[60] flex flex-col overflow-hidden border border-zinc-200 bg-white shadow-2xl sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[min(720px,calc(100dvh-120px))] sm:w-[410px] sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-2">
          <div>
            <p className="text-sm font-semibold text-zinc-900">
              Dùng thử {name}
            </p>
            <p className="text-[11px] text-zinc-500">
              Dữ liệu mẫu · Không cần đăng nhập
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Đóng bản dùng thử"
            className="grid size-11 shrink-0 place-items-center rounded-xl text-zinc-600 hover:bg-zinc-200"
          >
            <X className="size-5" />
          </button>
        </div>
        {open && (
          <iframe
            ref={frame}
            title={`Widget mẫu ${name}`}
            src={`/embed/${encodeURIComponent(tenant)}`}
            className="min-h-0 flex-1 border-0"
            allow="clipboard-write"
          />
        )}
      </div>
    </>
  );
}
