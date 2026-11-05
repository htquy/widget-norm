import { atLocal, addDays, localDate } from "@/domain/booking";
import { defaultSettings, isBotKind, type BotKind, type TenantSettings } from "@/domain/tenant";
import type { AccountRepository, AdminUserRepository, PasswordHasher, ServiceRepository } from "@/application/ports";
import type { Tenants } from "@/application/use-cases/tenants";
import type { BotModule } from "@/bots/types";
import { DEMO_KNOWLEDGE, DEMO_QUESTIONS, DEMO_SERVICES } from "@/bots/store/demo";
import { DEMO_TILE_KNOWLEDGE, DEMO_TILE_QUESTIONS, DEMO_TILE_SERVICES } from "@/bots/tile/demo";
import type { DB } from "./client";
import { bookings, events, leads, messageInsights, tenants } from "./schema";

export const DEMO_SLUG = "lumi-demo";
export const DEMO_TILE_SLUG = "gach-dep-demo";
export const DEMO_EMAIL = "admin@demo.vn";
export const DEMO_PASSWORD = "demo1234";

interface SeedDeps {
  tenants: Tenants;
  accounts: AccountRepository;
  users: AdminUserRepository;
  services: ServiceRepository;
  hasher: PasswordHasher;
  modules: Record<BotKind, BotModule>;
}

/**
 * - PGlite (không có DATABASE_URL) hoặc SEED_DEMO=true → tài khoản demo sở hữu 2 bot (bán hàng + gạch) kèm dữ liệu mẫu.
 * - DB thật + BOOTSTRAP_ADMIN_EMAIL/PASSWORD → tài khoản + bot đầu tiên (BOOTSTRAP_BOT_KIND, mặc định store).
 */
export async function seedIfEmpty(db: DB, deps: SeedDeps) {
  const existing = await db.select({ id: tenants.id }).from(tenants).limit(1);
  if (existing.length > 0) return;
  if (!process.env.DATABASE_URL || process.env.SEED_DEMO === "true") return seedDemo(db, deps);
  await bootstrap(deps);
}

async function bootstrap(deps: SeedDeps) {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn("[seed] Database trống. Đặt BOOTSTRAP_ADMIN_EMAIL và BOOTSTRAP_ADMIN_PASSWORD trong .env.local để tạo tài khoản quản trị đầu tiên (hoặc dùng trang /signup).");
    return;
  }
  if (password.length < 8) throw new Error("BOOTSTRAP_ADMIN_PASSWORD phải từ 8 ký tự");
  const shopName = process.env.BOOTSTRAP_SHOP_NAME?.trim() || "Cửa hàng của tôi";
  const kind = isBotKind(process.env.BOOTSTRAP_BOT_KIND) ? process.env.BOOTSTRAP_BOT_KIND : "store";
  const account = await deps.accounts.create({ name: shopName, email, plan: "business", trialEndsAt: null });
  await deps.users.create({ accountId: account.id, email, passwordHash: await deps.hasher.hash(password), name: shopName, role: "owner" });
  await deps.tenants.createBot(account.id, kind, shopName);
  console.warn(`[seed] Đã tạo tài khoản ${email} với bot "${shopName}" (${kind}).`);
}

async function seedDemo(db: DB, deps: SeedDeps) {
  const account = await deps.accounts.create({ name: "Tài khoản demo", email: DEMO_EMAIL, plan: "pro", trialEndsAt: null });
  await deps.users.create({ accountId: account.id, email: DEMO_EMAIL, passwordHash: await deps.hasher.hash(DEMO_PASSWORD), name: "Chủ shop demo", role: "owner" });

  /* ---- Bot 1: Lumi Beauty (bán hàng & đặt lịch) ---- */
  const lumiBase = defaultSettings("Lumi Beauty");
  const lumi = await deps.tenants.createBot(account.id, "store", "Lumi Beauty", {
    industry: "mỹ phẩm chăm sóc da & spa",
    phone: "0901 234 567",
    email: "hello@lumi.demo",
    address: "88 Lê Lợi, Q.1, TP.HCM",
    knowledgeBase: DEMO_KNOWLEDGE,
    botInstructions: "Tháng này: giảm 15% cho đơn mỹ phẩm từ 2 sản phẩm trở lên. Luôn hỏi loại da của khách trước khi gợi ý serum.",
    quickReplies: ["Da dầu mụn nên dùng gì?", "Đặt lịch soi da miễn phí", "Phí giao hàng", "Gặp nhân viên"],
    handoff: { ...lumiBase.handoff, zaloUrl: "https://zalo.me/0901234567" },
    theme: { ...lumiBase.theme, primaryColor: "#be185d", botName: "Lumi", headerSubtitle: "Chuyên viên da liễu online", proactiveMessage: "Bạn cần tư vấn routine cho da? Hỏi Lumi nhé!" },
  } satisfies Partial<TenantSettings>);
  await fixSlug(db, lumi.id, DEMO_SLUG);
  const lumiItems = await deps.modules.store.seedDemo(lumi.id);
  const lumiServices = await createServices(deps, lumi.id, DEMO_SERVICES);

  /* ---- Bot 2: Gạch Đẹp Demo (tư vấn & xem thử gạch) ---- */
  const tileBase = defaultSettings("Gạch Đẹp Demo");
  const tile = await deps.tenants.createBot(account.id, "tile", "Gạch Đẹp Demo", {
    industry: "gạch ốp lát & vật liệu hoàn thiện",
    phone: "0901 234 567",
    address: "123 Nguyễn Trãi, Q.1, TP.HCM",
    greeting: "Xin chào! Mình là trợ lý của Gạch Đẹp Demo. Anh/chị cần lát sàn hay ốp tường phòng nào ạ? Gửi ảnh phòng để mình cho xem thử gạch nhé.",
    knowledgeBase: DEMO_TILE_KNOWLEDGE,
    botInstructions: "Xưng em, gọi khách là anh/chị.",
    quickReplies: ["Mẫu lát phòng khách", "Gạch chống trơn phòng tắm", "Đặt lịch khảo sát tại nhà", "Gặp nhân viên"],
    theme: { ...tileBase.theme, primaryColor: "#15476d", botName: "Gạch Đẹp", headerSubtitle: "Tư vấn & xem thử gạch", launcherLabel: "Tư vấn & xem thử gạch", radius: "sharp" },
  } satisfies Partial<TenantSettings>);
  await fixSlug(db, tile.id, DEMO_TILE_SLUG);
  const tileItems = await deps.modules.tile.seedDemo(tile.id);
  const tileServices = await createServices(deps, tile.id, DEMO_TILE_SERVICES);

  if (process.env.SEED_DEMO_ANALYTICS !== "false") {
    await seedDemoAnalytics(db, { tenantId: lumi.id, items: lumiItems, services: lumiServices, questions: DEMO_QUESTIONS, interestEvent: "product_clicked", seed: 42, ab: false });
    await seedDemoAnalytics(db, { tenantId: tile.id, items: tileItems, services: tileServices, questions: DEMO_TILE_QUESTIONS, interestEvent: "preview_rendered", seed: 7, ab: true });
  }
}

async function fixSlug(db: DB, id: string, slug: string) {
  const { eq } = await import("drizzle-orm");
  await db.update(tenants).set({ slug }).where(eq(tenants.id, id));
}

async function createServices(deps: SeedDeps, tenantId: string, list: readonly { name: string; durationMin: number; price: number; desc: string }[]) {
  const out: { id: string; durationMin: number }[] = [];
  for (const s of list) {
    const created = await deps.services.create({ tenantId, name: s.name, durationMin: s.durationMin, price: s.price, description: s.desc, active: true });
    out.push({ id: created.id, durationMin: s.durationMin });
  }
  return out;
}

/** 30 ngày dữ liệu hoạt động giả lập — CHỈ cho shop demo để xem thử dashboard và báo cáo. */
async function seedDemoAnalytics(
  db: DB,
  o: {
    tenantId: string;
    items: string[];
    services: { id: string; durationMin: number }[];
    questions: readonly { text: string; label: string; topic: string; need: string; sentiment: string; handledBy: string; unanswered?: boolean }[];
    interestEvent: string;
    seed: number;
    ab: boolean;
  },
) {
  const { tenantId } = o;
  let s = o.seed;
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0), s / 2 ** 32);
  const now = Date.now();
  const ev: (typeof events.$inferInsert)[] = [];
  const ins: (typeof messageInsights.$inferInsert)[] = [];
  const ld: (typeof leads.$inferInsert)[] = [];
  const bk: (typeof bookings.$inferInsert)[] = [];
  for (let day = 29; day >= 0; day--) {
    const visitors = 18 + Math.floor(r() * 22) + Math.floor((29 - day) / 2);
    for (let v = 0; v < visitors; v++) {
      const visitorId = `demo-${o.seed}-${day}-${v}`;
      const conversationId = `demo-conv-${o.seed}-${day}-${v}`;
      // Bot gạch: 70% khách thấy trình xem thử (nhóm "visualizer"), xem thử làm tăng tỉ lệ để lại SĐT
      const variant = o.ab ? (r() < 0.7 ? "visualizer" : "control") : "default";
      const boost = variant === "visualizer" ? 1.5 : 1;
      const at = new Date(now - day * 86_400_000 - Math.floor(r() * 40_000_000));
      const push = (type: string, i: number, refId: string | null = null, value: number | null = null) =>
        ev.push({ tenantId, visitorId, type, variant, conversationId, refId, value, createdAt: new Date(at.getTime() + i * 60_000) });
      push("widget_open", 0);
      if (r() > 0.62) continue;
      push("message_sent", 1);
      const n = 1 + Math.floor(r() * 3);
      for (let k = 0; k < n; k++) {
        const q = o.questions[Math.floor(r() * o.questions.length)];
        ins.push({ tenantId, conversationId, text: q.text, label: q.label, confidence: 0.7 + r() * 0.3, topic: q.topic, need: q.need, sentiment: q.sentiment, handledBy: q.handledBy, unanswered: !!q.unanswered, createdAt: new Date(at.getTime() + (k + 1) * 60_000) });
        if (q.handledBy === "handoff") push("handoff_requested", 2);
      }
      const item = o.items[Math.floor(r() * r() * o.items.length)];
      if (o.ab) {
        if (variant === "visualizer" && r() < 0.45) {
          push("photo_uploaded", 2);
          if (r() < 0.85) push("preview_rendered", 3, item);
        }
        if (r() < 0.3 * boost) push("quote_created", 4, item, Math.round((3 + r() * 20) * 1_000_000));
      } else if (r() < 0.45) push(o.interestEvent, 2, item);
      if (o.services.length && r() < 0.18) {
        push("booking_opened", 3);
        if (r() < 0.6) {
          push("booking_created", 4);
          const svc = o.services[Math.floor(r() * o.services.length)];
          const date = addDays(localDate(at), 1 + Math.floor(r() * 5));
          const start = atLocal(date, `${String(9 + Math.floor(r() * 9)).padStart(2, "0")}:${r() < 0.5 ? "00" : "30"}`);
          const roll = r();
          const status = start.getTime() > now ? (roll < 0.5 ? "pending" : "confirmed") : roll < 0.75 ? "done" : roll < 0.9 ? "no_show" : "cancelled";
          bk.push({ id: crypto.randomUUID(), tenantId, serviceId: svc.id, conversationId, name: `Khách demo ${bk.length + 1}`, phone: `09${String(10_000_000 + Math.floor(r() * 89_999_999)).slice(0, 8)}`, note: "Dữ liệu mẫu", startAt: start, endAt: new Date(start.getTime() + svc.durationMin * 60_000), status, createdAt: at });
        }
      }
      if (r() < 0.12 * boost) {
        push("lead_created", 5);
        const roll = r();
        const status = roll < 0.3 ? "new" : roll < 0.5 ? "contacted" : roll < 0.65 ? "qualified" : roll < 0.85 ? "won" : "lost";
        ld.push({ id: crypto.randomUUID(), tenantId, conversationId, name: `Khách demo ${ld.length + 1}`, phone: `09${String(10_000_000 + Math.floor(r() * 89_999_999)).slice(0, 8)}`, note: "Dữ liệu mẫu", source: r() < 0.5 ? "form" : "handoff", status, wonValue: status === "won" ? Math.round((0.4 + r() * 2.5) * (o.ab ? 8 : 1) * 1_000_000) : null, meta: {}, createdAt: at, updatedAt: at });
      }
    }
  }
  for (let i = 0; i < ev.length; i += 500) await db.insert(events).values(ev.slice(i, i + 500));
  for (let i = 0; i < ins.length; i += 500) await db.insert(messageInsights).values(ins.slice(i, i + 500));
  for (let i = 0; i < ld.length; i += 200) await db.insert(leads).values(ld.slice(i, i + 200));
  for (let i = 0; i < bk.length; i += 200) await db.insert(bookings).values(bk.slice(i, i + 200));
}
