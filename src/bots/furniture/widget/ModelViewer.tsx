"use client";

import { useEffect, useState } from "react";

/**
 * Xem mô hình 3D (.glb) có xoay, thu phóng và nút AR (Android Scene Viewer / WebXR, iOS Quick Look).
 * Thư viện model-viewer chỉ nạp khi component này xuất hiện (không làm nặng widget lúc chat).
 */
export function ModelViewer({ src, alt, className = "", ar = true }: { src: string; alt: string; className?: string; ar?: boolean }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    import("@google/model-viewer")
      .then(() => alive && setReady(true))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);
  if (failed) return <p className="p-3 text-[12.5px] text-[var(--w-muted,#6b7280)]">Trình duyệt này chưa hiển thị được mô hình 3D.</p>;
  if (!ready) return <div className={`flex items-center justify-center text-[12.5px] ${className}`}>Đang tải khung xem 3D…</div>;
  return (
    <model-viewer
      src={src}
      alt={alt}
      ar={ar}
      ar-modes="webxr scene-viewer quick-look"
      camera-controls
      auto-rotate
      shadow-intensity="1"
      exposure="1"
      loading="lazy"
      className={className}
      style={{ width: "100%", height: "100%", background: "transparent" }}
    />
  );
}
