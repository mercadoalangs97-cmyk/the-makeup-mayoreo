import { createAdminSupabase } from "./supabase";
import { enviarCorreosVenta, type OrdenCorreo } from "./email";
import { LOTES } from "./lotes";
import { metaPurchase } from "./metaCapi";
import { idEventoCompra } from "./analytics";
import { SITE_URL } from "./site";
import { ESTADO_REVISION, motivoRevision } from "./antifraude";

// Lo que pasa cuando un pago queda APROBADO, sin importar la pasarela.
// Es el mismo camino que tenía el webhook de Mercado Pago (que se queda para
// los pagos viejos); el de Stripe llama aquí.

export type PagoAprobado = {
  ref: string; // id de la orden, o "APART-<cotizacion>"
  paymentId: string;
  monto: number;
  /** "credit_card" | "debit_card" | "prepaid_card" | "ticket" | "bank_transfer"… */
  tipoPago: string | null;
  comision: number;
  neto: number;
  email?: string | null;
};

export async function procesarPagoAprobado(p: PagoAprobado): Promise<{ ok: boolean; resultado?: string; msg?: string }> {
  const supabase = createAdminSupabase();

  // ---- Anticipo de cotización: no es venta, solo anota cuánto dejó ----
  if (p.ref.startsWith("APART-")) {
    const cotId = p.ref.slice(6);
    const { data: cotAct } = await supabase.from("cotizaciones").select("apartado_monto,cliente_nombre,envio").eq("id", cotId).maybeSingle();
    if (cotAct && !Number(cotAct.apartado_monto)) {
      await supabase
        .from("cotizaciones")
        .update({ apartado_monto: p.monto, apartado_en: Date.now(), apartado_pago_id: p.paymentId })
        .eq("id", cotId);
      try {
        const env = (cotAct.envio || {}) as Record<string, string>;
        await metaPurchase({
          eventId: "apartado_" + cotId,
          valor: p.monto,
          email: env.email || null,
          telefono: env.telefono || null,
          nombre: cotAct.cliente_nombre || env.nombre || null,
          ciudad: env.ciudad || null,
          estado: env.estado || null,
          cp: env.cp || null,
          numItems: 1,
          urlOrigen: `${SITE_URL}/cotizacion/${cotId}`,
        });
      } catch (e) {
        console.error("[pago] Meta CAPI (apartado):", e);
      }
    }
    return { ok: true, resultado: "apartado" };
  }

  const ordenId = p.ref;
  if (p.email) {
    await supabase.from("ordenes_web").update({ email: p.email }).eq("id", ordenId).is("email", null);
  }

  // Transaccional e IDEMPOTENTE en SQL: descuenta productos, nota de venta,
  // comisión como gasto; los lotes quedan "pagado - pendiente de preparar".
  const { data: resultado, error } = await supabase.rpc("procesar_pago_web", {
    p_orden_id: ordenId,
    p_payment_id: p.paymentId,
    p_mp_status: "approved",
    p_comision: Number(p.comision.toFixed(2)),
    p_neto: Number(p.neto.toFixed(2)),
  });
  if (error) return { ok: false, msg: error.message };
  if (resultado !== "ok") return { ok: true, resultado: String(resultado) };

  // Venta que vino de una cotización → pagada (panel y bot).
  try {
    const { data: ord } = await supabase.from("ordenes_web").select("envio").eq("id", ordenId).single();
    const cotId = (ord?.envio as Record<string, unknown> | null)?.cotizacion;
    if (cotId) await supabase.from("cotizaciones").update({ pagada: true }).eq("id", String(cotId));
  } catch (e) {
    console.error("[pago] marcar cotización pagada:", e);
  }

  // Antifraude: tarjeta + monto grande + nunca escribió por WhatsApp → revisión.
  try {
    const { data: ord } = await supabase.from("ordenes_web").select("status,wpp,envio").eq("id", ordenId).single();
    const env = (ord?.envio || {}) as Record<string, unknown>;
    const motivo = ord
      ? await motivoRevision({
          tipoPago: p.tipoPago,
          monto: p.monto,
          telefono: (ord.wpp as string) || (env.telefono as string) || null,
        })
      : null;
    if (ord && motivo) {
      await supabase
        .from("ordenes_web")
        .update({
          status: ESTADO_REVISION,
          envio: { ...env, revision: { motivo, status_previo: ord.status, desde: Date.now() } },
        })
        .eq("id", ordenId);
    }
  } catch (e) {
    console.error("[pago] revisión antifraude:", e);
  }

  // Correos + Meta, solo en el primer procesamiento.
  try {
    const { data: orden } = await supabase
      .from("ordenes_web")
      .select("id,items,total,envio,cliente,email,mp_fee,mp_neto")
      .eq("id", ordenId)
      .single();
    if (orden) {
      const items = (orden.items || []) as Array<{ tipo: string; ref: string; foto?: string | null }>;
      const skus = items.filter((i) => i.tipo === "producto").map((i) => i.ref);
      const fotos = new Map<string, string | null>();
      if (skus.length > 0) {
        const { data: prods } = await supabase.from("productos").select("sku,foto").in("sku", skus);
        (prods || []).forEach((x) => fotos.set(x.sku, x.foto));
      }
      for (const it of items) {
        it.foto = it.tipo === "lote" ? LOTES.find((l) => l.id === it.ref)?.foto ?? null : fotos.get(it.ref) ?? null;
      }
      await enviarCorreosVenta(orden as OrdenCorreo);
      try {
        const env = (orden.envio || {}) as Record<string, string>;
        await metaPurchase({
          eventId: idEventoCompra(ordenId),
          valor: Number(orden.total) || 0,
          email: orden.email || env.email || null,
          telefono: env.telefono || null,
          nombre: orden.cliente || env.nombre || null,
          ciudad: env.ciudad || null,
          estado: env.estado || null,
          cp: env.cp || null,
          contentIds: items.map((i) => i.ref),
          numItems: items.length,
          urlOrigen: `${SITE_URL}/checkout/exito`,
        });
      } catch (e) {
        console.error("[pago] Meta CAPI (venta):", e);
      }
    }
  } catch (e) {
    console.error("[pago] correos:", e);
  }
  return { ok: true, resultado: "ok" };
}
