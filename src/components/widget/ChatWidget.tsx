"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WidgetAction } from "@/domain/conversation";
import type { WidgetTheme } from "@/domain/theme";
import { widgetApi, type Entry, type ProductCard, type PublicConfig } from "./api";
import type { ExtHelpers, WidgetExtension } from "./extension";
import { extensionFor } from "./extensions";
import { BookingPanel, ContactPanel, ProductCards } from "./Panels";
import { fontHref, widgetVars } from "./theme";

interface Msg extends Entry {
  /** Thẻ danh mục (hình dạng do module bot quyết định) */
  products?: unknown[];
  /** Dữ liệu module kèm câu trả lời (vd báo giá) */
  extrasData?: Record<string, unknown>;
  pending?: boolean;
  local?: boolean;
}

type Panel =
  | { kind: "none" }
  | { kind: "booking"; serviceId?: string; hint?: string }
  | { kind: "lead" }
  | { kind: "callback" }
  | { kind: "ext"; name: string; data?: unknown };

function newVisitorId() {
  return (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9-]/g, "");
}

/** Dữ liệu tĩnh cho chế độ xem trước ở trang Giao diện widget (không gọi API) */
export interface PreviewData {
  config: PublicConfig;
  messages: Msg[];
}

export function ChatWidget({ tenant, visitorId: givenVisitorId, origin, preview }: { tenant: string; visitorId?: string; origin?: string; preview?: PreviewData }) {
  const visitorId = useMemo(() => {
    if (givenVisitorId && /^[A-Za-z0-9_-]{8,64}$/.test(givenVisitorId)) return givenVisitorId;
    if (preview) return "preview-visitor";
    try {
      const v = localStorage.getItem("wn_vid") ?? newVisitorId();
      localStorage.setItem("wn_vid", v);
      return v;
    } catch {
      return newVisitorId();
    }
  }, [givenVisitorId, preview]);
  const api = useMemo(() => widgetApi(tenant, visitorId), [tenant, visitorId]);

  const [config, setConfig] = useState<PublicConfig | null>(preview?.config ?? null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>(preview?.messages ?? []);
  const [mode, setMode] = useState<"bot" | "human">("bot");
  const [rating, setRating] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [panel, setPanel] = useState<Panel>({ kind: "none" });
  const [loadError, setLoadError] = useState("");
  const [prefersDark, setPrefersDark] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Xem trước: cập nhật theo form admin
  useEffect(() => {
    if (preview) {
      setConfig(preview.config);
      setMessages(preview.messages);
    }
  }, [preview]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setPrefersDark(mq.matches);
    const on = (e: MediaQueryListEvent) => setPrefersDark(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    if (preview) return;
    api
      .config(origin ?? null)
      .then((d) => {
        setConfig(d.config);
        setConversationId(d.conversationId);
        setMode(d.mode);
        setRating(d.rating);
        const byId = new Map((d.products as { id: string }[]).map((p) => [p.id, p]));
        setMessages(d.transcript.map((m) => ({ ...m, products: m.productIds?.map((id) => byId.get(id)).filter((p) => !!p) })));
        api.track("widget_open", { conversationId: d.conversationId });
      })
      .catch((e) => setLoadError(e.message));
  }, [api, origin, preview]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, panel.kind]);

  /* ---- Hỏi tin mới từ nhân viên: nhanh khi đang chat với người / chờ người, chậm khi bot ---- */
  const lastServerId = [...messages].reverse().find((m) => !m.local && !m.pending)?.id ?? null;
  const waitingHuman = mode === "human" || messages.some((m) => m.action?.type === "handoff");
  const merge = useCallback((entries: Entry[]) => {
    if (!entries.length) return;
    setMessages((cur) => {
      const have = new Set(cur.map((m) => m.id));
      const add = entries.filter((e) => !have.has(e.id));
      return add.length ? [...cur, ...add] : cur;
    });
  }, []);
  useEffect(() => {
    if (preview || !conversationId) return;
    const t = setInterval(
      () => {
        if (document.hidden || sending) return;
        api
          .poll(conversationId, lastServerId)
          .then((r) => {
            setMode(r.mode);
            merge(r.entries);
          })
          .catch(() => undefined);
      },
      waitingHuman ? 4000 : 20000,
    );
    return () => clearInterval(t);
  }, [api, conversationId, lastServerId, waitingHuman, sending, merge, preview]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || sending) return;
    if (preview) return;
    setSending(true);
    setInput("");
    const now = new Date().toISOString();
    const tempId = `local-${Date.now()}`;
    setMessages((m) => [...m, { id: tempId, role: "user", text: t, at: now, local: true }, ...(mode === "bot" ? [{ id: `${tempId}-p`, role: "assistant" as const, text: "", at: now, pending: true, local: true }] : [])]);
    try {
      const res = await api.chat(t);
      setConversationId(res.conversationId);
      setMode(res.mode);
      setMessages((m) => {
        const rest = m.filter((x) => x.id !== `${tempId}-p`);
        return res.reply ? [...rest, { ...res.reply, products: res.products, extrasData: res.extras }] : rest;
      });
      if (res.reply?.action?.type === "booking") setPanel({ kind: "booking", serviceId: res.reply.action.serviceId });
    } catch (e) {
      setMessages((m) => [...m.filter((x) => x.id !== `${tempId}-p`), { id: `${tempId}-e`, role: "system", text: e instanceof Error ? e.message : "Có lỗi xảy ra", at: now, local: true }]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  const pushLocal = (text: string, extrasData?: Record<string, unknown>) =>
    setMessages((m) => [...m, { id: `local-${Date.now()}`, role: "assistant", text, at: new Date().toISOString(), local: true, extrasData }]);

  async function feedback(entry: Msg, value: 1 | -1) {
    if (!conversationId || entry.local) return;
    setMessages((m) => m.map((x) => (x.id === entry.id ? { ...x, feedback: value } : x)));
    api.feedback(conversationId, entry.id, value).catch(() => undefined);
  }

  function close() {
    window.parent?.postMessage({ type: "wn:close" }, "*");
  }

  if (loadError) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-white p-6 text-center" role="alert">
        <p className="text-[15px] font-medium text-red-700">{loadError}</p>
        <p className="mt-1 text-[13px] text-neutral-600">Vui lòng thử lại sau.</p>
      </div>
    );
  }
  if (!config) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-white text-[14px] text-neutral-600" aria-busy="true">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700" />
        Đang kết nối trợ lý…
      </div>
    );
  }

  const theme: WidgetTheme = config.theme;
  const dark = theme.colorScheme === "dark" || (theme.colorScheme === "auto" && prefersDark);
  const font = fontHref(theme);
  const assistantCount = messages.filter((m) => m.role === "assistant" && !m.local).length;
  const showRating = !preview && rating === null && assistantCount >= 3 && !sending;
  const ext: WidgetExtension | null = extensionFor(config.kind);
  const helpers: ExtHelpers = {
    tenant,
    visitorId,
    conversationId,
    config,
    send: (t) => void send(t),
    openPanel: (name, data) => setPanel({ kind: "ext", name, data }),
    closePanel: () => setPanel({ kind: "none" }),
    pushLocal,
  };
  const fullScreen = panel.kind === "ext" && !!ext?.fullScreenPanels?.includes(panel.name);

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[var(--w-bg)] text-[var(--w-fg)]" style={widgetVars(theme, dark)}>
      {font && <link rel="stylesheet" href={font} />}
      <header className="flex items-center gap-3 bg-[var(--w-primary)] px-3 py-2.5 text-[var(--w-on-primary)]">
        <Avatar theme={theme} shopName={config.shopName} size={40} ring />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-tight">{theme.botName}</p>
          <p className="flex items-center gap-1.5 truncate text-[12.5px] opacity-90">
            <span className={`inline-block h-2 w-2 rounded-full ${config.openNow ? "bg-emerald-400" : "bg-neutral-300"}`} aria-hidden="true" />
            {mode === "human" ? "Nhân viên đang trả lời" : theme.headerSubtitle || (config.openNow ? "Đang hoạt động" : "Ngoài giờ — vẫn trả lời tự động")}
          </p>
        </div>
        {config.phone && (
          <a href={`tel:${config.phone.replace(/\s/g, "")}`} aria-label={`Gọi ${config.phone}`} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-black/10">
            <PhoneIcon />
          </a>
        )}
        <button type="button" onClick={close} aria-label="Thu nhỏ cửa sổ chat" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-black/10">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </header>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-4" aria-live="polite" aria-label="Nội dung trò chuyện">
        <Bubble theme={theme} shopName={config.shopName} role="assistant" text={config.greeting} />
        {messages.map((m) => (
          <Fragment key={m.id}>
            {m.role === "system" ? (
              <p className="mx-auto max-w-[90%] text-center text-[12.5px] text-[var(--w-muted)]">{m.text}</p>
            ) : (
              <Bubble theme={theme} shopName={config.shopName} role={m.role} text={m.text} pending={m.pending} agentName={m.agentName} />
            )}
            {m.products && m.products.length > 0 && (
              <div className="pl-9">
                {ext?.renderCards ? (
                  ext.renderCards(m.products, helpers)
                ) : (
                  <ProductCards
                    products={m.products as ProductCard[]}
                    onAsk={(p) => {
                      api.track("product_clicked", { conversationId, refId: p.id });
                      send(`Cho mình biết thêm về ${p.name}`);
                    }}
                    onOpen={(p) => api.track("product_clicked", { conversationId, refId: p.id })}
                  />
                )}
              </div>
            )}
            {m.extrasData && ext?.renderExtras && <div className="pl-9">{ext.renderExtras(m.extrasData, helpers)}</div>}
            {m.action && <ActionCard action={m.action} config={config} onBooking={(serviceId) => setPanel({ kind: "booking", serviceId })} onCallback={() => setPanel({ kind: "callback" })} mode={mode} />}
            {(m.role === "assistant" || m.role === "agent") && !m.pending && !m.local && !preview && (
              <div className="flex gap-1 pl-9" aria-label="Đánh giá câu trả lời">
                <FeedbackBtn active={m.feedback === 1} label="Hữu ích" onClick={() => feedback(m, 1)} up />
                <FeedbackBtn active={m.feedback === -1} label="Chưa hữu ích" onClick={() => feedback(m, -1)} />
              </div>
            )}
          </Fragment>
        ))}
        {showRating && (
          <RatingBar
            onRate={(n) => {
              setRating(n);
              if (conversationId) api.rate(conversationId, n).catch(() => undefined);
            }}
          />
        )}
      </div>

      <div className="border-t border-[var(--w-border)] bg-[var(--w-surface)] px-2.5 pb-2 pt-2">
        {ext?.quickActions && mode === "bot" && <div className="-mx-0.5 mb-2 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5">{ext.quickActions(helpers)}</div>}
        {config.quickReplies.length > 0 && mode === "bot" && (
          <div className="-mx-0.5 mb-2 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5">
            {config.quickReplies.map((q) => (
              <button
                key={q}
                type="button"
                disabled={sending}
                onClick={() => (/đặt lịch/i.test(q) && config.bookingEnabled ? (setPanel({ kind: "booking", hint: q }), api.track("booking_opened", { conversationId })) : send(q))}
                className="min-h-9 shrink-0 rounded-[var(--w-r-pill)] border border-[var(--w-border)] bg-[var(--w-surface)] px-3 text-[13px] font-medium text-[var(--w-fg)] transition hover:border-[var(--w-primary)] hover:text-[var(--w-primary)] disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-end gap-2"
        >
          <label htmlFor="wn-input" className="sr-only">
            Nhập tin nhắn
          </label>
          <textarea
            id="wn-input"
            ref={inputRef}
            rows={1}
            value={input}
            maxLength={2000}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder={mode === "human" ? "Nhắn cho nhân viên…" : "Nhập câu hỏi của bạn…"}
            className="max-h-28 min-h-11 min-w-0 flex-1 resize-none rounded-[var(--w-r-control)] border border-[var(--w-border)] bg-[var(--w-surface-2)] px-3.5 py-2.5 text-[15px] text-[var(--w-fg)] outline-none placeholder:text-[var(--w-muted)] focus:border-[var(--w-primary)] focus:bg-[var(--w-surface)]"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            aria-label="Gửi"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--w-r-pill)] bg-[var(--w-primary)] text-[var(--w-on-primary)] transition hover:brightness-110 disabled:opacity-40"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </form>
        <div className="mt-1.5 flex items-center justify-between px-1 text-[11.5px] text-[var(--w-muted)]">
          <button type="button" onClick={() => setPanel({ kind: "lead" })} className="min-h-7 underline-offset-2 hover:underline">
            Để lại liên hệ
          </button>
          {theme.showBranding && <span>Trợ lý AI · Widget Norm</span>}
        </div>
      </div>

      {panel.kind !== "none" && (
        <div className="absolute inset-0 z-30 flex flex-col bg-black/40 animate-fade-in" onClick={(e) => e.target === e.currentTarget && setPanel({ kind: "none" })}>
          <div role="dialog" aria-modal="true" className={`mt-auto flex min-h-0 flex-col overflow-hidden bg-[var(--w-surface)] shadow-2xl animate-slide-up ${fullScreen ? "h-full" : "max-h-[92%] rounded-t-[var(--w-r-frame)]"}`}>
            {panel.kind === "ext" && ext?.renderPanel?.(panel.name, panel.data, helpers)}
            {panel.kind === "booking" && (
              <BookingPanel
                api={api}
                conversationId={conversationId}
                initialServiceId={panel.serviceId}
                hint={panel.hint}
                onClose={() => setPanel({ kind: "none" })}
                onDone={(text) => {
                  setPanel({ kind: "none" });
                  pushLocal(text);
                }}
              />
            )}
            {(panel.kind === "lead" || panel.kind === "callback") && (
              <ContactPanel
                mode={panel.kind}
                api={api}
                conversationId={conversationId}
                onClose={() => setPanel({ kind: "none" })}
                onDone={(text) => {
                  setPanel({ kind: "none" });
                  pushLocal(text);
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Thành phần nhỏ ---------------- */

function Avatar({ theme, shopName, size, ring }: { theme: WidgetTheme; shopName: string; size: number; ring?: boolean }) {
  const style = { width: size, height: size };
  if (theme.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={theme.avatarUrl} alt="" style={style} className={`shrink-0 rounded-full object-cover ${ring ? "ring-2 ring-white/40" : ""}`} />;
  }
  return (
    <span
      style={{ ...style, fontSize: size * 0.42 }}
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${ring ? "bg-white/20 ring-2 ring-white/30" : "bg-[var(--w-primary)] text-[var(--w-on-primary)]"}`}
      aria-hidden="true"
    >
      {(theme.botName || shopName).trim().slice(0, 1).toUpperCase()}
    </span>
  );
}

/** Hiển thị an toàn: **đậm** và link https, không dùng innerHTML */
function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|https?:\/\/[^\s)]+)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <strong key={i}>{p.slice(2, -2)}</strong>
        ) : /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noreferrer" className="break-all underline">
            {p}
          </a>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

function Bubble({ theme, shopName, role, text, pending, agentName }: { theme: WidgetTheme; shopName: string; role: "user" | "assistant" | "agent" | "system"; text: string; pending?: boolean; agentName?: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && <Avatar theme={theme} shopName={shopName} size={28} />}
      <div className="max-w-[82%]">
        {role === "agent" && <p className="mb-0.5 text-[11.5px] font-medium text-[var(--w-muted)]">{agentName ?? "Nhân viên"}</p>}
        <div
          className={`rounded-[var(--w-r-bubble)] px-3.5 py-2.5 text-[14.5px] leading-relaxed ${
            isUser ? "rounded-br-[4px] bg-[var(--w-primary)] text-[var(--w-on-primary)]" : "rounded-bl-[4px] border border-[var(--w-border)] bg-[var(--w-surface)] text-[var(--w-fg)]"
          }`}
        >
          {pending ? (
            <span className="flex items-center gap-1 py-1" aria-label="Đang trả lời">
              {[0, 150, 300].map((d) => (
                <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-[var(--w-muted)]" style={{ animationDelay: `${d}ms` }} />
              ))}
            </span>
          ) : (
            <p className="whitespace-pre-wrap break-words">
              <RichText text={text} />
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionCard({ action, config, onBooking, onCallback, mode }: { action: WidgetAction; config: PublicConfig; onBooking: (serviceId?: string) => void; onCallback: () => void; mode: "bot" | "human" }) {
  const btn = "flex min-h-11 items-center justify-center gap-2 rounded-[var(--w-r-control)] px-3 text-[14px] font-semibold transition";
  if (action.type === "booking") {
    return (
      <div className="pl-9">
        <button type="button" onClick={() => onBooking(action.serviceId)} className={`${btn} w-full bg-[var(--w-primary)] text-[var(--w-on-primary)] hover:brightness-110`}>
          <CalendarIcon /> Chọn giờ đặt lịch
        </button>
      </div>
    );
  }
  if (action.type === "lead") return null;
  return (
    <div className="ml-9 space-y-2 rounded-[var(--w-r-bubble)] border border-[var(--w-border)] bg-[var(--w-surface)] p-3">
      <p className="text-[13px] font-semibold text-[var(--w-fg)]">{mode === "human" ? "Nhân viên đang hỗ trợ bạn" : "Kết nối với nhân viên"}</p>
      {config.handoff.liveChat && config.openNow && mode !== "human" && <p className="text-[13px] text-[var(--w-muted)]">Nhân viên sẽ vào cuộc trò chuyện này — bạn cứ để cửa sổ mở nhé.</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onCallback} className={`${btn} col-span-2 bg-[var(--w-primary)] text-[var(--w-on-primary)] hover:brightness-110`}>
          Để lại số, nhân viên gọi lại
        </button>
        {config.phone && (
          <a href={`tel:${config.phone.replace(/\s/g, "")}`} className={`${btn} border border-[var(--w-border)] text-[var(--w-fg)] hover:bg-[var(--w-surface-2)]`}>
            <PhoneIcon /> Gọi ngay
          </a>
        )}
        {config.handoff.zaloUrl && (
          <a href={config.handoff.zaloUrl} target="_blank" rel="noreferrer" className={`${btn} border border-[var(--w-border)] text-[var(--w-fg)] hover:bg-[var(--w-surface-2)]`}>
            Chat Zalo
          </a>
        )}
        {config.handoff.messengerUrl && (
          <a href={config.handoff.messengerUrl} target="_blank" rel="noreferrer" className={`${btn} border border-[var(--w-border)] text-[var(--w-fg)] hover:bg-[var(--w-surface-2)]`}>
            Messenger
          </a>
        )}
      </div>
    </div>
  );
}

function FeedbackBtn({ active, label, onClick, up }: { active: boolean; label: string; onClick: () => void; up?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`flex h-9 w-9 items-center justify-center rounded-full transition ${active ? "bg-[var(--w-primary)]/15 text-[var(--w-primary)]" : "text-[var(--w-muted)] hover:bg-[var(--w-surface-2)]"}`}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={up ? undefined : { transform: "rotate(180deg)" }}>
        <path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
      </svg>
    </button>
  );
}

function RatingBar({ onRate }: { onRate: (n: number) => void }) {
  return (
    <div className="mx-auto mt-2 w-fit rounded-[var(--w-r-bubble)] border border-[var(--w-border)] bg-[var(--w-surface)] px-3 py-2 text-center">
      <p className="text-[13px] text-[var(--w-muted)]">Bạn thấy cuộc trò chuyện thế nào?</p>
      <div className="mt-1 flex justify-center" role="radiogroup" aria-label="Đánh giá từ 1 đến 5 sao">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => onRate(n)} aria-label={`${n} sao`} className="flex h-10 w-10 items-center justify-center text-[22px] text-amber-400 hover:scale-110">
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

const PhoneIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.1 9.9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);
const CalendarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);
