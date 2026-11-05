import { DomainError } from "@/domain/errors";
import type { NewService, ServiceRepository } from "../ports";

/** Dịch vụ đặt lịch — dùng chung mọi loại bot (spa, khảo sát công trình, tư vấn tại showroom...) */
export function makeServices(deps: { services: ServiceRepository }) {
  return {
    list: (tenantId: string, activeOnly = false) => deps.services.list(tenantId, activeOnly),
    get: (tenantId: string, id: string) => deps.services.findById(tenantId, id),
    async save(tenantId: string, id: string | null, s: Omit<NewService, "tenantId">) {
      if (!s.name.trim()) throw new DomainError("BAD_SERVICE", "Nhập tên dịch vụ");
      if (s.durationMin < 5 || s.durationMin > 600) throw new DomainError("BAD_SERVICE", "Thời lượng từ 5 đến 600 phút");
      if (id) await deps.services.update(tenantId, id, s);
      else await deps.services.create({ ...s, tenantId });
    },
    remove: (tenantId: string, id: string) => deps.services.delete(tenantId, id),
  };
}

export type Services = ReturnType<typeof makeServices>;
