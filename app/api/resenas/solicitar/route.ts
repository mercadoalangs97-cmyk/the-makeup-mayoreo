import { NextResponse } from "next/server";
import { createAdminSupabase } from "../../../lib/supabase";
import { enviarCorreoResena, type OrdenCorreo } from "../../../lib/email";

// Cron de SOLICITUD DE OPINIÓN: a los ~7 días de que el pedido se marcó como
// enviado, pide su opinión al cliente (una sola vez).
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
  const hasta = ahora - 7 * 24 * 3600 * 1000; // enviado hace 7 días o más
  const desde = ahora - 45 * 24 * 3600 * 1000; // no perseguir pedidos viejísimos

  const { data, error } = await supabase
    .from("ordenes_web")
    .select("id, items, total, envio, cliente, email, enviado, enviado_en, resena_enviada")
    .eq("enviado", true)
    .not("email", "is", null)
    .neq("resena_enviada", true)
    .lte("enviado_en", hasta)
    .gte("enviado_en", desde)
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let enviados = 0;
  for (const o of data || []) {
    const ok = await enviarCorreoResena(o as unknown as OrdenCorreo);
    // Se marca aunque falle, para no reintentar en bucle.
    await supabase
      .from("ordenes_web")
      .update({ resena_enviada: true, resena_enviada_en: new Date().toISOString() })
      .eq("id", o.id);
    if (ok) enviados++;
  }

  return NextResponse.json({ ok: true, candidatos: (data || []).length, enviados });
}
