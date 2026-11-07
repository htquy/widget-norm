"use client";

import { useT } from "@/lib/i18n/client";
import { useActionState } from "react";
import { submitWith } from "@/components/admin/form";
import { btnPrimary } from "@/components/admin/ui";
import { saveTileAction } from "./actions";
import { MAX_DESCRIPTION_LENGTH, MAX_TILE_IMAGES, type Tile } from "@/bots/tile/domain/tile";

const L = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
    <label className="block text-[14px]">
      <span className="mb-1 block text-neutral-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[12px] text-neutral-500">{hint}</span>}
    </label>
  );

export function TileForm({ tile }: { tile?: Tile }) {
  const t = useT();
  const [state, action, pending] = useActionState(saveTileAction, undefined);
  const field = "w-full rounded-lg border border-neutral-300 px-3 py-2 text-[14px]";
  return (
    <form onSubmit={submitWith(action)} className="grid gap-4 sm:grid-cols-2">
      {tile && <input type="hidden" name="id" value={tile.id} />}
      <L label="SKU">
        <input name="sku" required defaultValue={tile?.sku} className={field} />
      </L>
      <L label={t("Tên mẫu")}>
        <input name="name" required defaultValue={tile?.name} className={field} />
      </L>
      <div className="grid grid-cols-3 gap-2">
        <L label={t("Rộng (mm)")}>
          <input name="widthMm" type="number" required defaultValue={tile?.widthMm ?? 600} className={field} />
        </L>
        <L label={t("Dài (mm)")}>
          <input name="heightMm" type="number" required defaultValue={tile?.heightMm ?? 600} className={field} />
        </L>
        <L label={t("Dày (mm)")}>
          <input name="thicknessMm" type="number" step="0.5" required defaultValue={tile?.thicknessMm ?? 9} className={field} />
        </L>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <L label={t("Số viên/thùng")}>
          <input name="piecesPerBox" type="number" required defaultValue={tile?.piecesPerBox ?? 4} className={field} />
        </L>
        <L label={t("Tồn kho (thùng)")}>
          <input name="stock" type="number" required defaultValue={tile?.stock ?? 0} className={field} />
        </L>
      </div>
      <L label={t("Giá (VND/m²)")}>
        <input name="pricePerM2" type="number" required defaultValue={tile?.pricePerM2} className={field} />
      </L>
      <L label={t("Bề mặt")}>
        <select name="finish" defaultValue={tile?.finish ?? "matte"} className={field}>
          <option value="glossy">{t("Bóng")}</option>
          <option value="matte">{t("Mờ")}</option>
          <option value="textured">{t("Nhám")}</option>
        </select>
      </L>
      <L label={t("Phong cách / từ khoá")} hint={t("Chatbot dùng để tìm mẫu, vd: vân đá hiện đại sang trọng")}>
        <input name="style" defaultValue={tile?.style} className={field} />
      </L>
      <L label={t("Màu")}>
        <input name="color" defaultValue={tile?.color} className={field} />
      </L>
      <fieldset className="text-[14px]">
        <legend className="mb-1 text-neutral-700">{t("Công dụng")}</legend>
        <label className="mr-4 inline-flex items-center gap-2">
          <input type="checkbox" name="usage" value="floor" defaultChecked={tile ? tile.usage.includes("floor") : true} /> {t("Lát sàn")}
        </label>
        <label className="mr-4 inline-flex items-center gap-2">
          <input type="checkbox" name="usage" value="wall" defaultChecked={tile?.usage.includes("wall")} /> {t("Ốp tường")}
        </label>
        <label className="mr-4 inline-flex items-center gap-2">
          <input type="checkbox" name="usage" value="outdoor" defaultChecked={tile?.usage.includes("outdoor")} /> {t("Sân vườn / ngoài trời")}
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" name="usage" value="roof" defaultChecked={tile?.usage.includes("roof")} /> {t("Lợp mái (ngói)")}
        </label>
        <p className="mt-1 text-[12px] text-neutral-500">
          {t("Ngói: nhập kích thước")} <b>{t("phần lộ ra")}</b> {t("sau khi chồng mí (vd ngói 22 viên/m² ≈ 200×227 mm), số viên/thùng = 1, giá/m² = giá/viên × số viên/m². Báo giá sẽ ra số viên.")}
        </p>
      </fieldset>
      <label className="inline-flex items-center gap-2 text-[14px]">
        <input type="checkbox" name="active" defaultChecked={tile?.active ?? true} /> {t("Đang bán")}
      </label>
      <div className="sm:col-span-2">
        <L label={t("Ảnh vân gạch")} hint={t("Ảnh chụp/scan thẳng đúng 1 viên, cắt sát mép, JPG/PNG/WEBP ≤ 5 MB. Ảnh này được lặp lại để phủ lên sàn/tường.")}>
          <div className="flex items-center gap-3">
            {tile?.textureUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tile.textureUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />
            )}
            <input type="file" name="texture" accept="image/jpeg,image/png,image/webp" required={!tile} className="text-[13px]" />
          </div>
        </L>
      </div>
      <div className="sm:col-span-2">
        <L
          label={t("Mô tả sản phẩm")}
          hint={t("Chatbot đọc phần này để tư vấn và trả lời câu hỏi của khách. Nên ghi: chất liệu, đặc tính (chống trơn, độ hút nước...), nên dùng ở đâu, lưu ý khi thi công, điểm nổi bật so với mẫu khác. Chỉ ghi điều đúng — bot sẽ trả lời theo đúng nội dung này.")}
        >
          <textarea name="description" rows={6} maxLength={MAX_DESCRIPTION_LENGTH} defaultValue={tile?.description} className={field} />
        </L>
      </div>
      <div className="sm:col-span-2">
        <L label={`Ảnh sản phẩm / công trình (tối đa ${MAX_TILE_IMAGES})`} hint={t("JPG/PNG/WEBP ≤ 5 MB mỗi ảnh. Ảnh đầu tiên hiện trên thẻ sản phẩm trong khung chat. Chọn được nhiều ảnh cùng lúc.")}>
          {tile && tile.images.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-3">
              {tile.images.map((url) => (
                <label key={url} className="block text-center text-[12px] text-neutral-600">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-20 w-20 rounded-lg object-cover" />
                  <span className="mt-1 inline-flex items-center gap-1">
                    <input type="checkbox" name="removeImage" value={url} /> {t("Xoá")}
                  </span>
                </label>
              ))}
            </div>
          )}
          <input type="file" name="images" multiple accept="image/jpeg,image/png,image/webp" className="text-[13px]" />
        </L>
      </div>
      {state?.error && <p className="text-[14px] text-red-600 sm:col-span-2">{state.error}</p>}
      <div className="sm:col-span-2">
        <button disabled={pending} className={btnPrimary}>
          {pending ? t("Đang lưu...") : t("Lưu mẫu")}
        </button>
      </div>
    </form>
  );
}
