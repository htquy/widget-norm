import { DomainError } from "@/domain/errors";
import { isOpenAt } from "@/domain/booking";
import { normalizeSettings, type Tenant, type TenantSettings } from "@/domain/tenant";
import type { AdminUserRepository, PasswordHasher, TenantRepository } from "../ports";

export function makeTenants(deps: { tenants: TenantRepository }) {
  const norm = (t: Tenant | null) => (t ? { ...t, settings: normalizeSettings(t.settings) } : null);
  return {
    async bySlug(slug: string): Promise<Tenant> {
      const t = norm(await deps.tenants.findBySlug(slug));
      if (!t) throw new DomainError("TENANT_NOT_FOUND", "Không tìm thấy cửa hàng");
      return t;
    },
    byId: async (id: string) => norm(await deps.tenants.findById(id)),

    /** Cấu hình công khai cho widget — chỉ những gì khách được thấy */
    publicConfig(tenant: Tenant, now = new Date()) {
      const s = tenant.settings;
      return {
        shopName: s.shopName,
        greeting: s.greeting,
        phone: s.phone,
        address: s.address,
        quickReplies: s.quickReplies,
        theme: s.theme,
        bookingEnabled: s.booking.enabled,
        handoff: { enabled: s.handoff.enabled, zaloUrl: s.handoff.zaloUrl, messengerUrl: s.handoff.messengerUrl, liveChat: s.handoff.liveChat },
        openNow: isOpenAt(s.hours, s.booking.closedDates, now),
      };
    },

    isOriginAllowed(tenant: Tenant, origin: string | null): boolean {
      const list = tenant.settings.allowedOrigins;
      if (list.length === 0 || !origin) return true;
      return list.some((o) => o.replace(/\/$/, "") === origin.replace(/\/$/, ""));
    },

    async updateSettings(id: string, settings: TenantSettings) {
      await deps.tenants.updateSettings(id, normalizeSettings(settings));
    },
  };
}

export type PublicConfig = ReturnType<ReturnType<typeof makeTenants>["publicConfig"]>;

export function makeAuth(deps: { users: AdminUserRepository; hasher: PasswordHasher }) {
  return {
    async login(email: string, password: string) {
      const user = await deps.users.findByEmail(email.trim().toLowerCase());
      if (!user || !(await deps.hasher.verify(password, user.passwordHash))) {
        throw new DomainError("BAD_LOGIN", "Email hoặc mật khẩu không đúng");
      }
      return { userId: user.id, tenantId: user.tenantId, name: user.name };
    },
  };
}

export type Tenants = ReturnType<typeof makeTenants>;
