import { TRIAL_DAYS, planById } from "@/domain/account";
import { isOpenAt } from "@/domain/booking";
import { DomainError } from "@/domain/errors";
import {
  defaultSettings,
  normalizeSettings,
  type BotKind,
  type Tenant,
  type TenantSettings,
} from "@/domain/tenant";
import { slugify } from "@/domain/text";
import type {
  AccountRepository,
  AdminUserRepository,
  PasswordHasher,
  TenantRepository,
} from "../ports";

export function makeTenants(deps: {
  tenants: TenantRepository;
  accounts: AccountRepository;
  onCreate: (t: Tenant) => Promise<void>;
}) {
  async function uniqueSlug(base: string): Promise<string> {
    const root = slugify(base) || "shop";
    for (let i = 0; i < 50; i++) {
      const slug = i === 0 ? root : `${root}-${i + 1}`;
      if (!(await deps.tenants.slugExists(slug))) return slug;
    }
    return `${root}-${crypto.randomUUID().slice(0, 6)}`;
  }

  return {
    async bySlug(slug: string): Promise<Tenant> {
      const t = await deps.tenants.findBySlug(slug);
      if (!t)
        throw new DomainError("TENANT_NOT_FOUND", "Không tìm thấy cửa hàng");
      return t;
    },
    byId: (id: string) => deps.tenants.findById(id),
    listByAccount: (accountId: string) => deps.tenants.listByAccount(accountId),
    account: (id: string) => deps.accounts.findById(id),
    countByKind: () => deps.tenants.countByKind(),

    /** Cấu hình công khai cho widget — chỉ những gì khách được thấy */
    publicConfig(tenant: Tenant, now = new Date()) {
      const s = tenant.settings;
      return {
        kind: tenant.kind,
        shopName: s.shopName,
        greeting: s.greeting,
        phone: s.phone,
        address: s.address,
        quickReplies: s.quickReplies,
        theme: s.theme,
        bookingEnabled: s.booking.enabled,
        handoff: {
          enabled: s.handoff.enabled,
          zaloUrl: s.handoff.zaloUrl,
          messengerUrl: s.handoff.messengerUrl,
          liveChat: s.handoff.liveChat,
        },
        openNow: isOpenAt(s.hours, s.booking.closedDates, now),
      };
    },

    isOriginAllowed(tenant: Tenant, origin: string | null): boolean {
      const list = tenant.settings.allowedOrigins;
      if (list.length === 0 || !origin) return true;
      return list.some(
        (o) => o.replace(/\/$/, "") === origin.replace(/\/$/, ""),
      );
    },

    async updateSettings(id: string, settings: TenantSettings) {
      await deps.tenants.updateSettings(id, normalizeSettings(settings));
    },

    /** Tạo thêm bot cho tài khoản (kiểm tra giới hạn theo gói) */
    async createBot(
      accountId: string,
      kind: BotKind,
      shopName: string,
      overrides: Partial<TenantSettings> = {},
    ): Promise<Tenant> {
      const account = await deps.accounts.findById(accountId);
      if (!account)
        throw new DomainError("ACCOUNT_NOT_FOUND", "Không tìm thấy tài khoản");
      const existing = await deps.tenants.listByAccount(accountId);
      const plan = planById(account.plan);
      if (existing.length >= plan.maxBots)
        throw new DomainError(
          "PLAN_LIMIT",
          `Gói ${plan.name} tối đa ${plan.maxBots} chatbot. Nâng cấp gói để thêm.`,
        );
      const name = shopName.trim().slice(0, 80);
      if (!name) throw new DomainError("NO_NAME", "Nhập tên cửa hàng");
      const tenant = await deps.tenants.create({
        accountId,
        kind,
        slug: await uniqueSlug(name),
        name,
        settings: normalizeSettings({
          ...defaultSettings(name),
          ...overrides,
          shopName: name,
        }),
      });
      await deps.onCreate(tenant);
      return tenant;
    },
  };
}

export type PublicConfig = ReturnType<
  ReturnType<typeof makeTenants>["publicConfig"]
>;
export type Tenants = ReturnType<typeof makeTenants>;

export function makeAuth(deps: {
  users: AdminUserRepository;
  accounts: AccountRepository;
  hasher: PasswordHasher;
  tenants: Tenants;
  registerDomain?: (accountId: string, domain: string) => Promise<unknown>;
}) {
  return {
    async login(email: string, password: string) {
      const user = await deps.users.findByEmail(email.trim().toLowerCase());
      if (!user || !(await deps.hasher.verify(password, user.passwordHash))) {
        throw new DomainError("BAD_LOGIN", "Email hoặc mật khẩu không đúng");
      }
      const bots = await deps.tenants.listByAccount(user.accountId);
      return {
        userId: user.id,
        accountId: user.accountId,
        tenantId: bots[0]?.id ?? "",
        name: user.name,
      };
    },

    /** Đăng ký dùng thử: tạo tài khoản + chủ tài khoản + chatbot đầu tiên */
    async signup(input: {
      name: string;
      email: string;
      password: string;
      shopName: string;
      kind: BotKind;
      domain?: string;
    }) {
      const email = input.email.trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
        throw new DomainError("BAD_EMAIL", "Email chưa đúng");
      if (input.password.length < 8)
        throw new DomainError("WEAK_PASSWORD", "Mật khẩu tối thiểu 8 ký tự");
      if (await deps.users.findByEmail(email))
        throw new DomainError(
          "EMAIL_TAKEN",
          "Email này đã có tài khoản — vui lòng đăng nhập",
        );
      const name = input.name.trim().slice(0, 80) || email;
      const account = await deps.accounts.create({
        name: input.shopName.trim().slice(0, 80) || name,
        email,
        plan: "trial",
        trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 86_400_000),
      });
      if (input.domain && deps.registerDomain)
        await deps.registerDomain(account.id, input.domain);
      const user = await deps.users.create({
        accountId: account.id,
        email,
        passwordHash: await deps.hasher.hash(input.password),
        name,
        role: "owner",
      });
      const bot = await deps.tenants.createBot(
        account.id,
        input.kind,
        input.shopName,
      );
      return { userId: user.id, accountId: account.id, tenantId: bot.id, name };
    },
  };
}
