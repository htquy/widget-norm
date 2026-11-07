import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { BOT_METAS, metaBySlug } from "@/bots/catalog";
import { localizeMeta } from "@/bots/localize";
import { getT } from "@/lib/i18n/server";
import { DemoWidget } from "@/components/site/DemoWidget";
import { AviLanding } from "@/components/site/landings/AviLanding";
import { TileLanding } from "@/components/site/landings/TileLanding";
import { IeltsLanding } from "@/components/site/landings/IeltsLanding";
import { FurnitureLanding } from "@/components/site/landings/FurnitureLanding";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return BOT_METAS.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { t } = await getT();
  const m = metaBySlug((await params).slug);
  return m ? { title: t(m.name), description: t(m.tagline) } : {};
}

export default async function BotPage({ params }: Props) {
  const slug = (await params).slug;
  if (slug === "tro-ly-ban-hang") permanentRedirect("/bots/avi");
  const raw = metaBySlug(slug);
  if (!raw) notFound();
  const { t } = await getT();
  const meta = localizeMeta(raw, t);

  const demo = (
    <DemoWidget
      key={meta.demoSlug}
      tenant={meta.demoSlug}
      name={meta.shortName}
      accent={meta.accentHex}
    />
  );

  return (
    <>
      {demo}
      {meta.kind === "store" && <AviLanding meta={meta} />}
      {meta.kind === "tile" && <TileLanding meta={meta} />}
      {meta.kind === "education" && <IeltsLanding meta={meta} />}
      {meta.kind === "furniture" && <FurnitureLanding meta={meta} />}
    </>
  );
}
