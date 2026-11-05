"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Tải lại dữ liệu server định kỳ (khi tab đang hiển thị) — để nhân viên thấy tin mới của khách */
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (!document.hidden) router.refresh();
    }, seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}
