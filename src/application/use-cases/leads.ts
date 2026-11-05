import { DomainError } from "@/domain/errors";
import { normalizeVnPhone, type Lead, type LeadSource, type LeadStatus } from "@/domain/lead";
import type { Tenant } from "@/domain/tenant";
import type { EventRepository, LeadFilter, LeadRepository, Notifier } from "../ports";

export function makeLeads(deps: { leads: LeadRepository; events: EventRepository; notifier: Notifier; baseUrl: string }) {
  return {
    async capture(input: {
      tenant: Tenant;
      visitorId: string;
      conversationId: string | null;
      name: string;
      phone: string;
      email?: string;
      note: string;
      source: LeadSource;
    }): Promise<Lead> {
      const phone = normalizeVnPhone(input.phone);
      const name = input.name.trim().slice(0, 80);
      if (!name) throw new DomainError("NO_NAME", "Vui lòng nhập tên");
      const email = (input.email ?? "").trim().slice(0, 120);
      if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new DomainError("BAD_EMAIL", "Email chưa đúng");
      const lead = await deps.leads.create({
        tenantId: input.tenant.id,
        conversationId: input.conversationId,
        name,
        phone,
        email,
        note: input.note.trim().slice(0, 1000),
        source: input.source,
        status: "new",
        wonValue: null,
      });
      await deps.events.record({ tenantId: input.tenant.id, visitorId: input.visitorId, type: "lead_created", conversationId: input.conversationId });
      const text = [`Khách để lại liên hệ — ${input.tenant.settings.shopName}`, `${lead.name} — ${lead.phone}${email ? ` — ${email}` : ""}`, lead.note && `Ghi chú: ${lead.note}`, `${deps.baseUrl}/admin/leads/${lead.id}`]
        .filter(Boolean)
        .join("\n");
      if (input.source !== "handoff") deps.notifier.notify(input.tenant, "lead", text, { lead }).catch((e) => console.error("notify failed", e));
      return lead;
    },

    list: (tenantId: string, filter?: LeadFilter) => deps.leads.list(tenantId, filter),
    get: (tenantId: string, id: string) => deps.leads.findById(tenantId, id),

    async update(tenantId: string, id: string, patch: { status?: LeadStatus; note?: string; wonValue?: number | null }) {
      if (patch.wonValue != null && (!Number.isFinite(patch.wonValue) || patch.wonValue < 0)) throw new DomainError("BAD_VALUE", "Giá trị đơn không hợp lệ");
      await deps.leads.update(tenantId, id, patch);
    },
  };
}

export type Leads = ReturnType<typeof makeLeads>;
