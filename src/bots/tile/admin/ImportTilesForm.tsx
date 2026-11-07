"use client";

import { useActionState } from "react";
import { importTilesAction } from "./actions";
import { btnPrimary } from "@/components/admin/ui";

export function ImportTilesForm() {
  const [state, action, pending] = useActionState(importTilesAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3 text-[14px]">
      <input type="file" name="csv" accept=".csv,text/csv" required className="text-[13px]" />
      <button disabled={pending} className={btnPrimary}>
        {pending ? "Đang nhập..." : "Nhập"}
      </button>
      {state?.error && <p className="w-full text-red-600">{state.error}</p>}
      {state?.message && <p className={`w-full ${state.ok ? "text-emerald-700" : "text-amber-700"}`}>{state.message}</p>}
    </form>
  );
}
