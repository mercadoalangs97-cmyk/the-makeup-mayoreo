import { NextResponse } from "next/server";
import { Payment } from "mercadopago";
import { createAdminSupabase } from "../../../lib/supabase";
import { mpClient, mpConfigurado } from "../../../lib/mercadopago";
import { enviarCorreosVenta, type OrdenCorreo } from "../../../lib/email";
import { LOTES } from "../../../lib/lotes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Extrae el id de pago de la notificación (query o body, varios formatos de MP)
function extraerPaymentId(req: Request, body: Record<string, unknown>): {
  tipo: string | null;
  id: string | null;
} {
  const url = new URL(req.url);
  const tipo =
    url.searchParams.get("type") ||
    url.searchParams.get("topic") ||
    (body.type as string) ||
    (body.topic as string) ||
    null;
  const data = (body.data as { id?: string }) || {};
  const id =
    url.searchParams.get("data.id") ||
    url.searchParams.get("id") ||
    data.id ||
    (body.id as string) ||
    null;
  return { tipo, id: id ? String(id) : null };
}

async function manejar(req: Request): Promise<NextResponse> {
  if (!mpConfigurado()) {
    // 200 para que MP no reintente sin fin si aún no hay credenciales
    return NextResponse.json({ ok: false, reason: "mp_no_configurado" });
  }

  let body: Record<string, unknown> = {};
  try {
    const txt = await req.text();
    body = txt ? JSON.parse(txt) : {};
  } catch {
    body = {};
  }

  const { tipo, id } = extraerPaymentId(req, body);

  // Solo nos interesan notificaciones de pago
  if (tipo && !tipo.includes("payment")) {
    return NextResponse.json({ ok: true, ignored: tipo });
  }
  if (!id) {
    return NextResponse.json({ ok: true, reason: "sin_id" });
  }

  // FUENTE DE VERDAD: consultamos el pago directo a Mercado Pago con nuestro
  // token (no confiamos en el body de la notificación).
  let pago;
  try {
    pago = await new Payment(mpClient()).get({ id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // 500 → MP reintenta más tarde
    return NextResponse.json(
      { ok: false, reason: "error_consulta_pago", msg },
      { status: 500 }
    );
  }

  const status = pago.status; // approved | pending | in_process | rejected | ...
  const ordenId = pago.external_reference;
  if (!ordenId) {
    return NextResponse.json({ ok: true, reason: "sin_external_reference" });
  }

  const supabase = createAdminSupabase();

  // Si aún NO está aprobado (ej. OXXO/SPEI pendiente), registramos estado y
  // esperamos a la siguiente notificación. No tocamos inventario.
  if (status !== "approved") {
    await supabase
      .from("ordenes_web")
      .update({ mp_status: status, mp_payment_id: String(pago.id) })
      .eq("id", ordenId)
      .eq("inventario_descontado", false);
    return NextResponse.json({ ok: true, status });
  }

  // NOTA: el cliente/email/wpp ya se capturaron en /checkout (fuente de verdad
  // para el envío). NO los sobrescribimos con el payer de MP (que en pruebas
  // viene vacío). Solo guardamos el email del payer si la orden no tuviera uno.
  const payerEmail = pago.payer?.email;
  if (payerEmail) {
    await supabase
      .from("ordenes_web")
      .update({ email: payerEmail })
      .eq("id", ordenId)
      .is("email", null);
  }

  // Comisión REAL y neto recibido (de Mercado Pago, no estimado)
  const comision = (pago.fee_details || [])
    .filter((f) => f.fee_payer === "collector")
    .reduce((s, f) => s + (Number(f.amount) || 0), 0);
  const neto =
    pago.transaction_details?.net_received_amount ??
    (pago.transaction_amount || 0) - comision;

  // Procesamiento transaccional e IDEMPOTENTE en una función SQL:
  // - productos: descuenta SKU + registra movimiento + crea nota de venta
  // - lotes: NO toca inventario; deja la orden "pagado - pendiente de preparar"
  // - comisión de MP: se registra como gasto (utilidades reales)
  const { data: resultado, error } = await supabase.rpc("procesar_pago_web", {
    p_orden_id: ordenId,
    p_payment_id: String(pago.id),
    p_mp_status: status,
    p_comision: Number(comision.toFixed(2)),
    p_neto: Number(Number(neto).toFixed(2)),
  });

  if (error) {
    return NextResponse.json(
      { ok: false, reason: "error_procesar", msg: error.message },
      { status: 500 }
    );
  }

  // Correos de confirmación SOLO en el primer procesamiento (idempotente):
  // si MP reenvía el webhook, la función SQL devuelve 'ya_procesada' y no
  // volvemos a enviar. Best-effort: si el correo falla, no rompe el webhook.
  if (resultado === "ok") {
    try {
      const { data: orden } = await supabase
        .from("ordenes_web")
        .select("id,items,total,envio,cliente,email,mp_fee,mp_neto")
        .eq("id", ordenId)
        .single();
      if (orden) {
        // Enriquecer cada ítem con su foto para los correos
        const items = (orden.items || []) as Array<{
          tipo: string;
          ref: string;
          foto?: string | null;
        }>;
        const skus = items.filter((i) => i.tipo === "producto").map((i) => i.ref);
        const fotos = new Map<string, string | null>();
        if (skus.length > 0) {
          const { data: prods } = await supabase
            .from("productos")
            .select("sku,foto")
            .in("sku", skus);
          (prods || []).forEach((p) => fotos.set(p.sku, p.foto));
        }
        for (const it of items) {
          it.foto =
            it.tipo === "lote"
              ? LOTES.find((l) => l.id === it.ref)?.foto ?? null
              : fotos.get(it.ref) ?? null;
        }
        await enviarCorreosVenta(orden as OrdenCorreo);
      }
    } catch (e) {
      console.error("[webhook] error enviando correos:", e);
    }
  }

  return NextResponse.json({ ok: true, orden: ordenId, resultado });
}

export async function POST(req: Request) {
  return manejar(req);
}

// MP a veces hace pings GET para validar la URL
export async function GET() {
  return NextResponse.json({ ok: true });
}
