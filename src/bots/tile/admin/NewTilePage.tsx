import { requireSession } from "@/infrastructure/auth/session";
import { Card, PageHeader } from "@/components/admin/ui";
import { TileForm } from "./TileForm";

export default async function NewTilePage() {
  await requireSession();
  return (
    <>
      <PageHeader title="Thêm mẫu gạch" />
      <Card>
        <TileForm />
      </Card>
    </>
  );
}
