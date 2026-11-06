import bcrypt from "bcryptjs";
import { app } from "../src/infrastructure/container";
import { getDb } from "../src/infrastructure/db/client";
import { accountRepo, adminUserRepo, serviceRepo } from "../src/adapters/db/repositories";
import {
  seedDemoAnalytics,
  createServices,
  DEMO_EMAIL,
  DEMO_PASSWORD,
  DEMO_SLUG,
  DEMO_TILE_SLUG,
} from "../src/infrastructure/db/seed";
import {
  DEMO_KNOWLEDGE,
  DEMO_QUESTIONS,
  DEMO_SERVICES,
} from "../src/bots/store/demo";
import {
  DEMO_TILE_KNOWLEDGE,
  DEMO_TILE_QUESTIONS,
  DEMO_TILE_SERVICES,
} from "../src/bots/tile/demo";
import { defaultSettings } from "../src/domain/tenant";
import {
  bookings,
  leads,
  tenants,
  adminUsers,
  accounts,
} from "../src/infrastructure/db/schema";
import { eq, sql } from "drizzle-orm";
import { productRepo } from "../src/bots/store/repository";

async function main() {
  console.log("=== BẮT ĐẦU NẠP DỮ LIỆU MẪU VÀO DATABASE VÀ CLOUDFLARE R2 ===");
  const c = await app();
  const db = await getDb();
  const accountsRepo = accountRepo(db);
  const usersRepo = adminUserRepo(db);

  // 1. Kiểm tra hoặc tạo tài khoản demo
  const [existingAcc] = await db.select().from(accounts).where(eq(accounts.email, DEMO_EMAIL)).limit(1);
  let account;
  if (!existingAcc) {
    account = await accountsRepo.create({
      name: "Tài khoản demo",
      email: DEMO_EMAIL,
      plan: "pro",
      trialEndsAt: null,
    });
    console.log("✓ Đã tạo tài khoản demo:", DEMO_EMAIL);
  } else {
    account = existingAcc;
    console.log("✓ Tài khoản demo đã tồn tại:", account.email);
  }

  // 2. Kiểm tra hoặc tạo admin user
  const existingUsers = await db.select().from(adminUsers).where(eq(adminUsers.email, DEMO_EMAIL));
  if (existingUsers.length === 0) {
    await usersRepo.create({
      accountId: account.id,
      email: DEMO_EMAIL,
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
      name: "Chủ shop demo",
      role: "owner",
    });
    console.log("✓ Đã tạo user quản trị:", DEMO_EMAIL, "(mật khẩu: " + DEMO_PASSWORD + ")");
  } else {
    await db.update(adminUsers).set({ accountId: account.id }).where(eq(adminUsers.email, DEMO_EMAIL));
    console.log("✓ User quản trị đã tồn tại:", DEMO_EMAIL);
  }

  // 3. Khởi tạo / Cập nhật bot AVI Shop (avi-demo)
  let avi = await c.tenants.bySlug(DEMO_SLUG).catch(() => null);
  if (!avi) {
    const lumiBase = defaultSettings("AVI Shop");
    avi = await c.tenants.createBot(account.id, "store", "AVI Shop", {
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
    });
    await db.update(tenants).set({ slug: DEMO_SLUG }).where(eq(tenants.id, avi.id));
    avi = await c.tenants.bySlug(DEMO_SLUG);
    console.log("✓ Đã tạo bot AVI Shop (avi-demo)");
  } else {
    await db.update(tenants).set({ accountId: account.id }).where(eq(tenants.id, avi.id));
    console.log("✓ Bot AVI Shop đã tồn tại:", avi.slug);
  }

  // 4. Khởi tạo / Cập nhật bot Gạch Đẹp Demo (gach-dep-demo)
  let tile = await c.tenants.bySlug(DEMO_TILE_SLUG).catch(() => null);
  if (!tile) {
    const tileBase = defaultSettings("Gạch Đẹp Demo");
    tile = await c.tenants.createBot(account.id, "tile", "Gạch Đẹp Demo", {
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
    });
    await db.update(tenants).set({ slug: DEMO_TILE_SLUG }).where(eq(tenants.id, tile.id));
    tile = await c.tenants.bySlug(DEMO_TILE_SLUG);
    console.log("✓ Đã tạo bot Gạch Đẹp Demo (gach-dep-demo)");
  } else {
    await db.update(tenants).set({ accountId: account.id, kind: "tile" }).where(eq(tenants.id, tile.id));
    console.log("✓ Bot Gạch Đẹp Demo đã tồn tại:", tile.slug);
  }

  // 5. Nạp danh mục sản phẩm mẫu cho AVI Shop
  const pRepo = productRepo(db);
  const currentProds = await pRepo.list(avi.id);
  let lumiItems: string[] = [];
  if (currentProds.length === 0) {
    lumiItems = await c.moduleOf(avi).seedDemo(avi.id);
    console.log(`✓ Đã nạp ${lumiItems.length} sản phẩm mẫu cho AVI Shop`);
  } else {
    lumiItems = currentProds.map((p) => p.id);
    console.log(`✓ AVI Shop đã có sẵn ${currentProds.length} sản phẩm`);
  }

  // 6. Nạp mẫu gạch cho Gạch Đẹp Demo & ĐẨY LÊN CLOUDFLARE R2
  const currentTiles = await c.tileRepos.tiles.list(tile.id);
  let tileItems: string[] = [];
  if (currentTiles.length === 0) {
    console.log("-> Đang tạo hoa văn SVG và tải lên Cloudflare R2...");
    tileItems = await c.moduleOf(tile).seedDemo(tile.id);
    const updatedTiles = await c.tileRepos.tiles.list(tile.id);
    console.log(`✓ Đã nạp ${tileItems.length} mẫu gạch lên DB và đẩy ảnh lên Cloudflare R2 thành công:`);
    for (const t of updatedTiles) {
      console.log(`  - [${t.sku}] ${t.name}: ${t.textureUrl}`);
    }
  } else {
    tileItems = currentTiles.map((t) => t.id);
    console.log(`✓ Gạch Đẹp Demo đã có sẵn ${currentTiles.length} mẫu gạch (Texture URL: ${currentTiles[0]?.textureUrl})`);
  }

  // Đồng bộ ảnh placeholder và các texture có sẵn trên đĩa lên R2 (nếu có)
  try {
    const fs = await import("node:fs/promises");
    const placeholderBytes = await fs.readFile("public/placeholder-tile.svg").catch(() => null);
    if (placeholderBytes) {
      const phUrl = await c.files.put("assets/placeholder-tile.svg", placeholderBytes, "image/svg+xml");
      console.log(`✓ Đã tải placeholder-tile.svg lên Cloudflare R2: ${phUrl}`);
    }

    const localTextureDir = "storage/968ff9a0-3804-453f-9fbf-aac7e327a1a1/textures";
    const files = await fs.readdir(localTextureDir).catch(() => []);
    for (const file of files) {
      if (file.endsWith(".svg")) {
        const bytes = await fs.readFile(`${localTextureDir}/${file}`);
        await c.files.put(`${tile.id}/textures/${file}`, bytes, "image/svg+xml");
      }
    }
    if (files.length > 0) {
      console.log(`✓ Đã sao chép ${files.length} file ảnh hoa văn từ ổ đĩa storage/ lên Cloudflare R2.`);
    }
  } catch (e) {
    console.warn("Lưu ý khi sync file lên R2:", e);
  }

  // 7. Nạp dịch vụ mẫu
  const sRepo = serviceRepo(db);
  const aviServicesList = await c.services.list(avi.id);
  let lumiServices = aviServicesList.map((s) => ({ id: s.id, durationMin: s.durationMin }));
  if (lumiServices.length === 0) {
    lumiServices = await createServices({ services: sRepo } as any, avi.id, DEMO_SERVICES);
    console.log(`✓ Đã nạp ${lumiServices.length} dịch vụ cho AVI Shop`);
  }

  const tileServicesList = await c.services.list(tile.id);
  let tileServices = tileServicesList.map((s) => ({ id: s.id, durationMin: s.durationMin }));
  if (tileServices.length === 0) {
    tileServices = await createServices({ services: sRepo } as any, tile.id, DEMO_TILE_SERVICES);
    console.log(`✓ Đã nạp ${tileServices.length} dịch vụ cho Gạch Đẹp Demo`);
  }

  // 8. Nạp dữ liệu phân tích, hội thoại, lead, đặt lịch 30 ngày nếu chưa có
  const [bookingCount] = await db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(bookings);

  if (bookingCount.count < 5) {
    console.log("-> Đang sinh 30 ngày dữ liệu thống kê, lead và đặt lịch mẫu...");
    await seedDemoAnalytics(db, {
      tenantId: avi.id,
      items: lumiItems,
      services: lumiServices,
      questions: DEMO_QUESTIONS,
      interestEvent: "product_clicked",
      seed: 42,
      ab: false,
    });
    console.log("✓ Đã sinh dữ liệu phân tích 30 ngày cho AVI Shop");

    await seedDemoAnalytics(db, {
      tenantId: tile.id,
      items: tileItems,
      services: tileServices,
      questions: DEMO_TILE_QUESTIONS,
      interestEvent: "preview_rendered",
      seed: 7,
      ab: true,
    });
    console.log("✓ Đã sinh dữ liệu phân tích 30 ngày cho Gạch Đẹp Demo");
  } else {
    console.log("✓ Database đã có sẵn dữ liệu phân tích và lịch hẹn");
  }

  console.log("\n=== NẠP DỮ LIỆU MẪU VÀ ĐẨY R2 HOÀN TẤT THÀNH CÔNG 100%! ===");
  process.exit(0);
}

main().catch((err) => {
  console.error("LỖI KHI NẠP DỮ LIỆU:", err);
  process.exit(1);
});
