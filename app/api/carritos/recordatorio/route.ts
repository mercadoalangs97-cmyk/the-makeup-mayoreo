import { NextResponse } from "next/server";
import { createAdminSupabase } from "../../../lib/supabase";
import { enviarCorreoCarrito, type OrdenCorreo } from "../../../lib/email";

// Cron de CARRITOS ABANDONADOS: manda un correo recordatorio (con incentivo)
// a quien inició el checkout, dejó su correo y NO llegó a pagar.
// Protegido con CRON_SECRET (Vercel Cron manda Authorization: Bearer <secret>).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function autorizado(req: Request): boolean {
  const secret = process.env.CRON_SECRET || "";
  if (!secret) return false;
  const auth = req.headers.get("authorization") || "";
  const qs = new URL(req.url).searchParams.get("secret") || "";
  return auth === `Bearer ${secret}` || qs === secret;
}

export async function GET(req: Request) {
  if (!autorizado(req)) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }

  const supabase = createAdminSupabase();
  const ahora = Date.now();
  const desde = ahora - 48 * 3600 * 1000; // no más viejos de 48 h
  const hasta = ahora - 2 * 3600 * 1000; // al menos 2 h de abandonado

  // Pendientes que NUNCA iniciaron un pago (mp_payment_id null = no eligieron
  // OXXO/SPEI; esos sí piensan pagar). Con correo y sin recordatorio previo.
  const { data, error } = await supabase
    .from("ordenes_web")
    .select(
      "id, items, total, envio, cliente, email, wpp, status, mp_payment_id, creado_en, recordatorio_enviado"
    )
    .eq("status", "pending")
    .is("mp_payment_id", null)
    .not("email", "is", null)
    .neq("recordatorio_enviado", true)
    .gte("creado_en", desde)
    .lte("creado_en", hasta)
    .order("creado_en", { ascending: true })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let enviados = 0;
  for (const o of data || []) {
    const ok = await enviarCorreoCarrito(o as unknown as OrdenCorreo);
    // Marcamos como recordado aunque el envío falle, para no reintentar en bucle.
    await supabase
      .from("ordenes_web")
      .update({
        recordatorio_enviado: true,
        recordatorio_en: new Date().toISOString(),
      })
      .eq("id", o.id);
    if (ok) enviados++;
  }

  return NextResponse.json({
    ok: true,
    candidatos: (data || []).length,
    enviados,
  });
}
