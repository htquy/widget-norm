import { ChatWidget } from "@/components/widget/ChatWidget";

export const metadata = { robots: { index: false } };

export default async function EmbedPage({ params, searchParams }: { params: Promise<{ tenant: string }>; searchParams: Promise<{ vid?: string; origin?: string }> }) {
  const { tenant } = await params;
  const { vid, origin } = await searchParams;
  return (
    <div className="relative h-dvh overflow-hidden">
      <ChatWidget tenant={tenant} visitorId={vid} origin={origin} />
    </div>
  );
}
