import type { Metadata } from "next";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import OpinarClient from "./OpinarClient";

// Página personal que mandamos por WhatsApp/correo: no debe indexarse.
export const metadata: Metadata = {
  title: "Déjanos tu opinión · AMARÉA",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ p?: string; n?: string }> };

export default async function OpinarPage({ searchParams }: Props) {
  const sp = await searchParams;
  return (
    <>
      <SiteHeader />
      <main className="op-main">
        <OpinarClient
          pedido={(sp.p || "").slice(0, 12)}
          nombre={(sp.n || "").slice(0, 40)}
        />
      </main>
      <SiteFooter />
    </>
  );
}
