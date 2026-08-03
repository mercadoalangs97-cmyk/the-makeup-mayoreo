import type { Metadata } from "next";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import CotizacionClient from "./CotizacionClient";

// Es una cotización personal que se manda por WhatsApp: NO debe indexarse.
export const metadata: Metadata = {
  title: "Tu cotización · AMARÉA",
  robots: { index: false, follow: false },
};

type Params = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || "";

export default async function Cotizacion({ searchParams }: Params) {
  const sp = await searchParams;
  const loteId = uno(sp.lote).trim();
  const qty = Math.min(20, Math.max(1, parseInt(uno(sp.qty) || "1", 10) || 1));
  // Solo letras/espacios y máx 24 caracteres (evita que la URL inyecte texto raro).
  const nombre = uno(sp.nombre)
    .replace(/[^\p{L}\s'.-]/gu, "")
    .trim()
    .slice(0, 24);

  return (
    <>
      <SiteHeader variant="mayoreo" />
      <main className="cot-main">
        <CotizacionClient loteId={loteId} qty={qty} nombre={nombre} />
      </main>
      <SiteFooter />
    </>
  );
}
