import { NextResponse } from "next/server";
import { Payment } from "mercadopago";
import { createAdminSupabase } from "../../../lib/supabase";
import { mpClient, mpConfigurado } from "../../../lib/mercadopago";

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

  // Aprobado: guardamos datos del comprador antes de procesar (para el movimiento)
  const payer = pago.payer || {};
  const nombre = [payer.first_name, payer.last_name].filter(Boolean).join(" ");
  await supabase
    .from("ordenes_web")
    .update({
      cliente: nombre || null,
      email: payer.email || null,
    })
    .eq("id", ordenId)
    .eq("inventario_descontado", false);

  // Procesamiento transaccional e IDEMPOTENTE en una función SQL:
  // - productos: descuenta SKU + registra movimiento
  // - lotes: NO toca inventario; deja la orden "pagado - pendiente de preparar"
  const { data: resultado, error } = await supabase.rpc("procesar_pago_web", {
    p_orden_id: ordenId,
    p_payment_id: String(pago.id),
    p_mp_status: status,
  });

  if (error) {
    return NextResponse.json(
      { ok: false, reason: "error_procesar", msg: error.message },
      { status: 500 }
    );
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
