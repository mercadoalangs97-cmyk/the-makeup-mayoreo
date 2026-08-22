import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import { createAdminSupabase } from "../../lib/supabase";
import { LOTES } from "../../lib/lotes";
import { itemsDeCotizacion, resolverItems } from "../../lib/cotItems";
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

  const resuelto = await resolverItems(itemsDeCotizacion(cot));
  if (resuelto.error || !resuelto.items.length) notFound();
  const loteItem = resuelto.items.find((i) => i.tipo === "lote");
  const lote = loteItem ? LOTES.find((l) => l.id === loteItem.ref) : undefined;
  const principal = resuelto.items[0];

  const env = (cot.envio || {}) as Record<string, string>;
  const qty = loteItem ? loteItem.qty : 1;
  const subtotal = resuelto.subtotal;
  const descuento = Math.max(0, Math.round(Number(cot.descuento) || 0));
  const envioCosto = Math.max(0, Math.round(Number(cot.envio_costo) || 0));

  const c: CotData = {
    id: codigo,
    nombre: (cot.cliente_nombre || env.nombre || "").split(" ")[0] || "",
    loteId: lote ? lote.id : "",
    loteNombre: principal.nombre,
    loteFoto: lote ? lote.foto : null,
    piezas: resuelto.piezasLote,
    qty,
    ppu: lote ? lote.precio / lote.piezas : 0,
    // Renglones de la cotización (lote y/o productos sueltos).
    lineas: resuelto.items.map((i) => ({
      nombre: i.nombre,
      qty: i.qty,
      importe: i.importe,
      esLote: i.tipo === "lote",
    })),
    subtotal,
    descuento,
    descuentoPct: cot.descuento_pct ?? null,
    envioCosto,
    envioPaqueteria: cot.envio_paqueteria || "",
    envioDias: cot.envio_dias ?? null,
    total: subtotal - descuento + envioCosto,
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
