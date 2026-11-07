import { atLocal, addDays, localDate } from "@/domain/booking";
import {
  defaultSettings,
  isBotKind,
  type BotKind,
  type TenantSettings,
} from "@/domain/tenant";
import type {
  AccountRepository,
  AdminUserRepository,
  PasswordHasher,
  ServiceRepository,
} from "@/application/ports";
import type { Tenants } from "@/application/use-cases/tenants";
import type { BotModule } from "@/bots/types";
import {
  DEMO_KNOWLEDGE,
  DEMO_QUESTIONS,
  DEMO_SERVICES,
} from "@/bots/store/demo";
import {
  DEMO_TILE_KNOWLEDGE,
  DEMO_TILE_QUESTIONS,
  DEMO_TILE_SERVICES,
} from "@/bots/tile/demo";
import { DEMO_EDU_KNOWLEDGE, DEMO_EDU_QUESTIONS, DEMO_EDU_SERVICES } from "@/bots/education/demo";
import { DEMO_FURNITURE_KNOWLEDGE, DEMO_FURNITURE_QUESTIONS, DEMO_FURNITURE_SERVICES } from "@/bots/furniture/demo";
import type { DB } from "./client";
import {
  accounts as accountsTable,
  bookings,
  conversations,
  events,
  leads,
  llmCalls,
  messageInsights,
  services as servicesTable,
  tenants,
} from "./schema";
import { productRepo } from "@/bots/store/repository";
import { eq } from "drizzle-orm";

export const DEMO_SLUG = "avi-demo";
export const DEMO_TILE_SLUG = "gach-dep-demo";
export const DEMO_EDU_SLUG = "trung-tam-demo";
export const DEMO_FURNITURE_SLUG = "noi-that-demo";
export const DEMO_EMAIL = "admin@demo.vn";
export const DEMO_PASSWORD = "demo1234";
/** Tài khoản demo sở hữu 5 bot (AVI, AVI Shop, gạch, đào tạo, nội thất) — vượt giới hạn gói Pro (3 bot). */
const DEMO_PLAN = "business";

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
  if (existing.length > 0) {
    await upgradeLumiDemo(db, deps);
    if (!process.env.DATABASE_URL || process.env.SEED_DEMO === "true") {
      // Bổ sung bot demo còn thiếu là việc phụ: lỗi ở đây không được làm hỏng mọi request.
      await ensureDemoBots(db, deps).catch((e) => console.error("[seed] ensureDemoBots:", e));
    }
    return;
  }
  if (!process.env.DATABASE_URL || process.env.SEED_DEMO === "true")
    return seedDemo(db, deps);
  await bootstrap(deps);
}

/** Đảm bảo cả hai bot demo avi-demo và gach-dep-demo đều tồn tại khi SEED_DEMO=true hoặc PGlite */
async function ensureDemoBots(db: DB, deps: SeedDeps) {
  const avi = await deps.tenants.bySlug(DEMO_SLUG).catch(() => null);
  const tile = await deps.tenants.bySlug(DEMO_TILE_SLUG).catch(() => null);
  const edu = await deps.tenants.bySlug(DEMO_EDU_SLUG).catch(() => null);
  const furn = await deps.tenants.bySlug(DEMO_FURNITURE_SLUG).catch(() => null);
  // Shop demo gạch đã có: bổ sung mẫu demo mới (ngói, sân vườn, gạch thẻ...) nếu còn thiếu
  if (tile) await deps.modules.tile.seedDemo(tile.id);
  if (furn) await deps.modules.furniture.seedDemo(furn.id);
  if (edu) {
    await deps.modules.education.seedDemo(edu.id);
    // Bot demo "đào tạo" cũ → đổi sang IELTS (chỉ fixture demo, không đụng bot của khách)
    if (/trợ lý tuyển sinh/.test(edu.settings.greeting)) await deps.tenants.updateSettings(edu.id, { ...edu.settings, ...eduDemoSettings(edu.settings), shopName: "Anh ngữ Sao Mai" });
  }
  if (avi && tile && edu && furn) return;

  const demoUser = await deps.users.findByEmail(DEMO_EMAIL).catch(() => null);
  let accountId: string;
  if (demoUser) {
    accountId = demoUser.accountId;
    // DB cũ tạo tài khoản demo ở gói Pro (tối đa 3 bot): thêm bot demo mới sẽ ném PLAN_LIMIT
    // ngay khi khởi tạo container và làm hỏng mọi request, kể cả chat.
    await db.update(accountsTable).set({ plan: DEMO_PLAN }).where(eq(accountsTable.id, accountId));
  } else {
    const existingTenant = await db.select({ accountId: tenants.accountId }).from(tenants).limit(1);
    if (existingTenant[0]?.accountId) {
      accountId = existingTenant[0].accountId;
    } else {
      const account = await deps.accounts.create({
        name: "Tài khoản demo",
        email: DEMO_EMAIL,
        plan: DEMO_PLAN,
        trialEndsAt: null,
      });
      accountId = account.id;
      await deps.users.create({
        accountId: account.id,
        email: DEMO_EMAIL,
        passwordHash: await deps.hasher.hash(DEMO_PASSWORD),
        name: "Chủ shop demo",
        role: "owner",
      });
    }
  }

  if (!avi) {
    const lumiBase = defaultSettings("AVI Shop");
    const lumi = await deps.tenants.createBot(accountId, "store", "AVI Shop", {
      industry: "bán lẻ đa ngành: thời trang, gia dụng, phụ kiện và quà tặng",
      phone: "0901 234 567",
      email: "hello@avi.demo",
      address: "88 Lê Lợi, Q.1, TP.HCM",
      knowledgeBase: DEMO_KNOWLEDGE,
      botInstructions:
        "Hỏi nhu cầu và ngân sách trước khi gợi ý. Chỉ dùng dữ liệu danh mục và chính sách đã nhập.",
      quickReplies: [
        "Quà tặng dưới 300.000đ",
        "Đặt lịch tư vấn",
        "Phí giao hàng",
        "Gặp nhân viên",
      ],
      handoff: { ...lumiBase.handoff, zaloUrl: "https://zalo.me/0901234567" },
      theme: {
        ...lumiBase.theme,
        primaryColor: "#5f45e4",
        botName: "AVI",
        headerSubtitle: "Trợ lý mua sắm của bạn",
        proactiveMessage: "Bạn đang tìm món đồ nào? Để AVI giúp nhé!",
      },
    } satisfies Partial<TenantSettings>);
    await fixSlug(db, lumi.id, DEMO_SLUG);
    const lumiItems = await deps.modules.store.seedDemo(lumi.id);
    const lumiServices = await createServices(deps, lumi.id, DEMO_SERVICES);
    if (process.env.SEED_DEMO_ANALYTICS !== "false") {
      await seedDemoAnalytics(db, {
        tenantId: lumi.id,
        items: lumiItems,
        services: lumiServices,
        questions: DEMO_QUESTIONS,
        interestEvent: "product_clicked",
        seed: 42,
        ab: false,
      });
    }
  }

  if (!tile) {
    const tileBase = defaultSettings("Gạch Đẹp Demo");
    const t = await deps.tenants.createBot(accountId, "tile", "Gạch Đẹp Demo", {
      industry: "gạch ốp lát & vật liệu hoàn thiện",
      phone: "0901 234 567",
      address: "123 Nguyễn Trãi, Q.1, TP.HCM",
      greeting:
        "Xin chào! Mình là trợ lý của Gạch Đẹp Demo. Anh/chị cần lát sàn hay ốp tường phòng nào ạ? Gửi ảnh phòng để mình cho xem thử gạch nhé.",
      knowledgeBase: DEMO_TILE_KNOWLEDGE,
      botInstructions: "Xưng em, gọi khách là anh/chị.",
      quickReplies: [
        "Mẫu lát phòng khách",
        "Gạch chống trơn phòng tắm",
        "Đặt lịch khảo sát tại nhà",
        "Gặp nhân viên",
      ],
      theme: {
        ...tileBase.theme,
        primaryColor: "#15476d",
        botName: "Gạch Đẹp",
        headerSubtitle: "Tư vấn & xem thử gạch",
        launcherLabel: "Tư vấn & xem thử gạch",
        radius: "sharp",
      },
    } satisfies Partial<TenantSettings>);
    await fixSlug(db, t.id, DEMO_TILE_SLUG);
    const tileItems = await deps.modules.tile.seedDemo(t.id);
    const tileServices = await createServices(deps, t.id, DEMO_TILE_SERVICES);
    if (process.env.SEED_DEMO_ANALYTICS !== "false") {
      await seedDemoAnalytics(db, {
        tenantId: t.id,
        items: tileItems,
        services: tileServices,
        questions: DEMO_TILE_QUESTIONS,
        interestEvent: "preview_rendered",
        seed: 7,
        ab: true,
      });
    }
  }

  if (!edu) await createEducationDemo(db, deps, accountId);
  if (!furn) await createFurnitureDemo(db, deps, accountId);
}

/** Only the named built-in fixture is upgraded; customer tenants are never rewritten. */
async function upgradeLumiDemo(db: DB, deps: SeedDeps) {
  const old = await deps.tenants.bySlug("lumi-demo").catch(() => null);
  if (
    !old ||
    !["Lumi Beauty", "AVI Shop"].includes(old.name) ||
    (await deps.accounts.findById(old.accountId))?.email !== DEMO_EMAIL
  )
    return;
  const base = defaultSettings("AVI Shop");
  await deps.tenants.updateSettings(old.id, {
    ...base,
    industry: "bán lẻ đa ngành",
    phone: "0901 234 567",
    email: "hello@avi.demo",
    address: "88 Lê Lợi, Q.1, TP.HCM",
    knowledgeBase: DEMO_KNOWLEDGE,
    quickReplies: [
      "Quà tặng dưới 300.000đ",
      "Đặt lịch tư vấn",
      "Phí giao hàng",
      "Gặp nhân viên",
    ],
    theme: {
      ...base.theme,
      primaryColor: "#5f45e4",
      botName: "AVI",
      headerSubtitle: "Trợ lý mua sắm của bạn",
    },
  });
  const repo = productRepo(db);
  for (const product of await repo.list(old.id))
    await repo.delete(old.id, product.id);
  for (const table of [
    bookings,
    leads,
    events,
    messageInsights,
    llmCalls,
    conversations,
    servicesTable,
  ])
    await db.delete(table).where(eq(table.tenantId, old.id));
  const items = await deps.modules.store.seedDemo(old.id);
  const services = await createServices(deps, old.id, DEMO_SERVICES);
  if (process.env.SEED_DEMO_ANALYTICS !== "false")
    await seedDemoAnalytics(db, {
      tenantId: old.id,
      items,
      services,
      questions: DEMO_QUESTIONS,
      interestEvent: "product_clicked",
      seed: 42,
      ab: false,
    });
  await fixSlug(db, old.id, DEMO_SLUG);
}

async function bootstrap(deps: SeedDeps) {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn(
      "[seed] Database trống. Đặt BOOTSTRAP_ADMIN_EMAIL và BOOTSTRAP_ADMIN_PASSWORD trong .env.local để tạo tài khoản quản trị đầu tiên (hoặc dùng trang /signup).",
    );
    return;
  }
  if (password.length < 8)
    throw new Error("BOOTSTRAP_ADMIN_PASSWORD phải từ 8 ký tự");
  const shopName =
    process.env.BOOTSTRAP_SHOP_NAME?.trim() || "Cửa hàng của tôi";
  const kind = isBotKind(process.env.BOOTSTRAP_BOT_KIND)
    ? process.env.BOOTSTRAP_BOT_KIND
    : "store";
  const account = await deps.accounts.create({
    name: shopName,
    email,
    plan: "business",
    trialEndsAt: null,
  });
  await deps.users.create({
    accountId: account.id,
    email,
    passwordHash: await deps.hasher.hash(password),
    name: shopName,
    role: "owner",
  });
  await deps.tenants.createBot(account.id, kind, shopName);
  console.warn(
    `[seed] Đã tạo tài khoản ${email} với bot "${shopName}" (${kind}).`,
  );
}

async function seedDemo(db: DB, deps: SeedDeps) {
  const account = await deps.accounts.create({
    name: "Tài khoản demo",
    email: DEMO_EMAIL,
    plan: DEMO_PLAN,
    trialEndsAt: null,
  });
  await deps.users.create({
    accountId: account.id,
    email: DEMO_EMAIL,
    passwordHash: await deps.hasher.hash(DEMO_PASSWORD),
    name: "Chủ shop demo",
    role: "owner",
  });

  /* ---- Bot 1: AVI Shop (bán hàng & đặt lịch) ---- */
  const lumiBase = defaultSettings("AVI Shop");
  const lumi = await deps.tenants.createBot(account.id, "store", "AVI Shop", {
    industry: "bán lẻ đa ngành: thời trang, gia dụng, phụ kiện và quà tặng",
    phone: "0901 234 567",
    email: "hello@avi.demo",
    address: "88 Lê Lợi, Q.1, TP.HCM",
    knowledgeBase: DEMO_KNOWLEDGE,
    botInstructions:
      "Hỏi nhu cầu và ngân sách trước khi gợi ý. Chỉ dùng dữ liệu danh mục và chính sách đã nhập.",
    quickReplies: [
      "Quà tặng dưới 300.000đ",
      "Đặt lịch tư vấn",
      "Phí giao hàng",
      "Gặp nhân viên",
    ],
    handoff: { ...lumiBase.handoff, zaloUrl: "https://zalo.me/0901234567" },
    theme: {
      ...lumiBase.theme,
      primaryColor: "#5f45e4",
      botName: "AVI",
      headerSubtitle: "Trợ lý mua sắm của bạn",
      proactiveMessage: "Bạn đang tìm món đồ nào? Để AVI giúp nhé!",
    },
  } satisfies Partial<TenantSettings>);
  await fixSlug(db, lumi.id, DEMO_SLUG);
  const lumiItems = await deps.modules.store.seedDemo(lumi.id);
  const lumiServices = await createServices(deps, lumi.id, DEMO_SERVICES);

  /* ---- Bot 2: Gạch Đẹp Demo (tư vấn & xem thử gạch) ---- */
  const tileBase = defaultSettings("Gạch Đẹp Demo");
  const tile = await deps.tenants.createBot(
    account.id,
    "tile",
    "Gạch Đẹp Demo",
    {
      industry: "gạch ốp lát & vật liệu hoàn thiện",
      phone: "0901 234 567",
      address: "123 Nguyễn Trãi, Q.1, TP.HCM",
      greeting:
        "Xin chào! Mình là trợ lý của Gạch Đẹp Demo. Anh/chị cần lát sàn hay ốp tường phòng nào ạ? Gửi ảnh phòng để mình cho xem thử gạch nhé.",
      knowledgeBase: DEMO_TILE_KNOWLEDGE,
      botInstructions: "Xưng em, gọi khách là anh/chị.",
      quickReplies: [
        "Mẫu lát phòng khách",
        "Gạch chống trơn phòng tắm",
        "Đặt lịch khảo sát tại nhà",
        "Gặp nhân viên",
      ],
      theme: {
        ...tileBase.theme,
        primaryColor: "#15476d",
        botName: "Gạch Đẹp",
        headerSubtitle: "Tư vấn & xem thử gạch",
        launcherLabel: "Tư vấn & xem thử gạch",
        radius: "sharp",
      },
    } satisfies Partial<TenantSettings>,
  );
  await fixSlug(db, tile.id, DEMO_TILE_SLUG);
  const tileItems = await deps.modules.tile.seedDemo(tile.id);
  const tileServices = await createServices(deps, tile.id, DEMO_TILE_SERVICES);

  if (process.env.SEED_DEMO_ANALYTICS !== "false") {
    await seedDemoAnalytics(db, {
      tenantId: lumi.id,
      items: lumiItems,
      services: lumiServices,
      questions: DEMO_QUESTIONS,
      interestEvent: "product_clicked",
      seed: 42,
      ab: false,
    });
    await seedDemoAnalytics(db, {
      tenantId: tile.id,
      items: tileItems,
      services: tileServices,
      questions: DEMO_TILE_QUESTIONS,
      interestEvent: "preview_rendered",
      seed: 7,
      ab: true,
    });
  }
  await createEducationDemo(db, deps, account.id);
  await createFurnitureDemo(db, deps, account.id);
}

/** Cấu hình bot demo IELTS (dùng cả khi tạo mới lẫn khi nâng cấp bot demo "đào tạo" cũ) */
const eduDemoSettings = (base: TenantSettings) =>
  ({
    industry: "trung tâm tiếng Anh và luyện thi IELTS",
    phone: "0901 234 567",
    address: "12 Nguyễn Du, Q.1, TP.HCM",
    greeting: "Xin chào! Mình là trợ lý của Anh ngữ Sao Mai. Bạn muốn biết mình đang ở band nào, hay cần lộ trình lên band mục tiêu trước ngày thi? Mình làm cả hai ngay trong chat nhé.",
    knowledgeBase: DEMO_EDU_KNOWLEDGE,
    botInstructions: "Xưng mình, gọi bạn. Chưa rõ trình độ thì mời làm test 15 câu; có band hiện tại và mục tiêu thì lập lộ trình.",
    quickReplies: ["Em mất gốc muốn 6.5", "Kịp thi trước tháng 6 không?", "Học thử miễn phí", "Gặp tư vấn viên"],
    theme: { ...base.theme, primaryColor: "#1d3a6e", botName: "Sao Mai IELTS", headerSubtitle: "Test đầu vào & lộ trình", launcherLabel: "Test trình độ IELTS" },
  }) satisfies Partial<TenantSettings>;

/** Bot 3: Anh ngữ Sao Mai (luyện thi IELTS) */
async function createEducationDemo(db: DB, deps: SeedDeps, accountId: string) {
  const base = defaultSettings("Anh ngữ Sao Mai");
  const t = await deps.tenants.createBot(accountId, "education", "Anh ngữ Sao Mai", eduDemoSettings(base));
  await fixSlug(db, t.id, DEMO_EDU_SLUG);
  const items = await deps.modules.education.seedDemo(t.id);
  const svc = await createServices(deps, t.id, DEMO_EDU_SERVICES);
  if (process.env.SEED_DEMO_ANALYTICS !== "false") {
    await seedDemoAnalytics(db, { tenantId: t.id, items, services: svc, questions: DEMO_EDU_QUESTIONS, interestEvent: "product_clicked", seed: 21, ab: false });
  }
}

/** Bot 4: Nhà Gỗ Demo (nội thất) */
async function createFurnitureDemo(db: DB, deps: SeedDeps, accountId: string) {
  const base = defaultSettings("Nhà Gỗ Demo");
  const t = await deps.tenants.createBot(accountId, "furniture", "Nhà Gỗ Demo", {
    industry: "nội thất: sofa, bàn ăn, giường, tủ",
    phone: "0901 234 567",
    address: "88 Điện Biên Phủ, Q.3, TP.HCM",
    greeting: "Xin chào! Mình là trợ lý của Nhà Gỗ Demo. Bạn đang bày trí phòng nào, kích thước khoảng bao nhiêu để mình chọn món đặt vừa nhé?",
    knowledgeBase: DEMO_FURNITURE_KNOWLEDGE,
    botInstructions: "Xưng mình, gọi bạn hoặc anh/chị. Hỏi loại phòng và kích thước trước khi chốt món lớn.",
    quickReplies: ["Sofa cho phòng khách", "Kiểm tra món có vừa phòng", "Đặt lịch đo đạc tại nhà", "Gặp nhân viên"],
    theme: { ...base.theme, primaryColor: "#9a5b2e", botName: "Nhà Gỗ", headerSubtitle: "Tư vấn nội thất", launcherLabel: "Tư vấn nội thất" },
  } satisfies Partial<TenantSettings>);
  await fixSlug(db, t.id, DEMO_FURNITURE_SLUG);
  const items = await deps.modules.furniture.seedDemo(t.id);
  const svc = await createServices(deps, t.id, DEMO_FURNITURE_SERVICES);
  if (process.env.SEED_DEMO_ANALYTICS !== "false") {
    await seedDemoAnalytics(db, { tenantId: t.id, items, services: svc, questions: DEMO_FURNITURE_QUESTIONS, interestEvent: "product_clicked", seed: 33, ab: false });
  }
}

async function fixSlug(db: DB, id: string, slug: string) {
  const { eq } = await import("drizzle-orm");
  await db.update(tenants).set({ slug }).where(eq(tenants.id, id));
}

export async function createServices(
  deps: SeedDeps,
  tenantId: string,
  list: readonly {
    name: string;
    durationMin: number;
    price: number;
    desc: string;
  }[],
) {
  const out: { id: string; durationMin: number }[] = [];
  for (const s of list) {
    const created = await deps.services.create({
      tenantId,
      name: s.name,
      durationMin: s.durationMin,
      price: s.price,
      description: s.desc,
      active: true,
    });
    out.push({ id: created.id, durationMin: s.durationMin });
  }
  return out;
}

/** 30 ngày dữ liệu hoạt động giả lập — CHỈ cho shop demo để xem thử dashboard và báo cáo. */
export async function seedDemoAnalytics(
  db: DB,
  o: {
    tenantId: string;
    items: string[];
    services: { id: string; durationMin: number }[];
    questions: readonly {
      text: string;
      label: string;
      topic: string;
      need: string;
      sentiment: string;
      handledBy: string;
      unanswered?: boolean;
    }[];
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
      const at = new Date(
        now - day * 86_400_000 - Math.floor(r() * 40_000_000),
      );
      const push = (
        type: string,
        i: number,
        refId: string | null = null,
        value: number | null = null,
      ) =>
        ev.push({
          tenantId,
          visitorId,
          type,
          variant,
          conversationId,
          refId,
          value,
          createdAt: new Date(at.getTime() + i * 60_000),
        });
      push("widget_open", 0);
      if (r() > 0.62) continue;
      push("message_sent", 1);
      const n = 1 + Math.floor(r() * 3);
      for (let k = 0; k < n; k++) {
        const q = o.questions[Math.floor(r() * o.questions.length)];
        ins.push({
          tenantId,
          conversationId,
          text: q.text,
          label: q.label,
          confidence: 0.7 + r() * 0.3,
          topic: q.topic,
          need: q.need,
          sentiment: q.sentiment,
          handledBy: q.handledBy,
          unanswered: !!q.unanswered,
          createdAt: new Date(at.getTime() + (k + 1) * 60_000),
        });
        if (q.handledBy === "handoff") push("handoff_requested", 2);
      }
      const item = o.items[Math.floor(r() * r() * o.items.length)];
      if (o.ab) {
        if (variant === "visualizer" && r() < 0.45) {
          push("photo_uploaded", 2);
          if (r() < 0.85) push("preview_rendered", 3, item);
        }
        if (r() < 0.3 * boost)
          push(
            "quote_created",
            4,
            item,
            Math.round((3 + r() * 20) * 1_000_000),
          );
      } else if (r() < 0.45) push(o.interestEvent, 2, item);
      if (o.services.length && r() < 0.18) {
        push("booking_opened", 3);
        if (r() < 0.6) {
          push("booking_created", 4);
          const svc = o.services[Math.floor(r() * o.services.length)];
          const date = addDays(localDate(at), 1 + Math.floor(r() * 5));
          const start = atLocal(
            date,
            `${String(9 + Math.floor(r() * 9)).padStart(2, "0")}:${r() < 0.5 ? "00" : "30"}`,
          );
          const roll = r();
          const status =
            start.getTime() > now
              ? roll < 0.5
                ? "pending"
                : "confirmed"
              : roll < 0.75
                ? "done"
                : roll < 0.9
                  ? "no_show"
                  : "cancelled";
          bk.push({
            id: crypto.randomUUID(),
            tenantId,
            serviceId: svc.id,
            conversationId,
            name: `Khách demo ${bk.length + 1}`,
            phone: `09${String(10_000_000 + Math.floor(r() * 89_999_999)).slice(0, 8)}`,
            note: "Dữ liệu mẫu",
            startAt: start,
            endAt: new Date(start.getTime() + svc.durationMin * 60_000),
            status,
            createdAt: at,
          });
        }
      }
      if (r() < 0.12 * boost) {
        push("lead_created", 5);
        const roll = r();
        const status =
          roll < 0.3
            ? "new"
            : roll < 0.5
              ? "contacted"
              : roll < 0.65
                ? "qualified"
                : roll < 0.85
                  ? "won"
                  : "lost";
        ld.push({
          id: crypto.randomUUID(),
          tenantId,
          conversationId,
          name: `Khách demo ${ld.length + 1}`,
          phone: `09${String(10_000_000 + Math.floor(r() * 89_999_999)).slice(0, 8)}`,
          note: "Dữ liệu mẫu",
          source: r() < 0.5 ? "form" : "handoff",
          status,
          wonValue:
            status === "won"
              ? Math.round((0.4 + r() * 2.5) * (o.ab ? 8 : 1) * 1_000_000)
              : null,
          meta: {},
          createdAt: at,
          updatedAt: at,
        });
      }
    }
  }
  for (let i = 0; i < ev.length; i += 500)
    await db.insert(events).values(ev.slice(i, i + 500));
  for (let i = 0; i < ins.length; i += 500)
    await db.insert(messageInsights).values(ins.slice(i, i + 500));
  for (let i = 0; i < ld.length; i += 200)
    await db.insert(leads).values(ld.slice(i, i + 200));
  for (let i = 0; i < bk.length; i += 200)
    await db.insert(bookings).values(bk.slice(i, i + 200));
}
