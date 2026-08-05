import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import { createAdminSupabase } from "../../lib/supabase";
import { LOTES } from "../../lib/lotes";
import CotizacionPago, { type CotData } from "./CotizacionPago";

// Cotización personal enviada por WhatsApp: NO debe indexarse.
export const metadata: Metadata = {
  title: "Tu cotización · AMARÉA",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function CotizacionPorId({ params }: Params) {
  const { id } = await params;
  const codigo = decodeURIComponent(id).trim().toUpperCase();

  const sb = createAdminSupabase();
  const { data: cot } = await sb
    .from("cotizaciones")
    .select("*")
    .eq("id", codigo)
    .maybeSingle();
  if (!cot) notFound();

  const lote = LOTES.find((l) => l.id === cot.lote_id);
  if (!lote) notFound();

  const env = (cot.envio || {}) as Record<string, string>;
  const qty = Math.max(1, Number(cot.qty) || 1);
  const subtotal = lote.precio * qty;
  const envioCosto = Math.max(0, Math.round(Number(cot.envio_costo) || 0));

  const c: CotData = {
    id: codigo,
    nombre: (cot.cliente_nombre || env.nombre || "").split(" ")[0] || "",
    loteNombre: lote.nombre,
    loteFoto: lote.foto,
    piezas: lote.piezas * qty,
    qty,
    ppu: lote.precio / lote.piezas,
    subtotal,
    envioCosto,
    envioPaqueteria: cot.envio_paqueteria || "",
    envioDias: cot.envio_dias ?? null,
    total: subtotal + envioCosto,
    ciudad: env.ciudad || "",
    estado: env.estado || "",
    cp: env.cp || "",
    pagada: !!cot.pagada,
    // Lo que NO le pedimos por WhatsApp: lo llena aquí antes de pagar.
    yaTiene: {
      nombre: (env.nombre || "").trim(),
      telefono: (env.telefono || "").trim(),
      email: (env.email || "").trim(),
      calle: (env.calle || "").trim(),
      numero: (env.numero || "").trim(),
      colonia: (env.colonia || "").trim(),
      referencias: (env.referencias || "").trim(),
    },
  };

  return (
    <>
      <SiteHeader variant="mayoreo" />
      <main className="cot-main">
        <CotizacionPago c={c} />
      </main>
      <SiteFooter />
    </>
  );
}
