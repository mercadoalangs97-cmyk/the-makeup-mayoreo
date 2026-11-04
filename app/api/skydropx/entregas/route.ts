import { NextResponse } from "next/server";
import { createAdminSupabase } from "../../../lib/supabase";
import { skydropxFetch, skydropxConfigurado } from "../../../lib/skydropx";
import { esBotAutorizado } from "../../../lib/botAuth";

// ENTREGAS (Alan, 4-nov-2026: "cuando a los clientes ya les llegue su paquete les puedas mandar un
// mensaje para que nos dejen una opinión"). Revisa en Skydropx los pedidos pagados de los últimos
// 30 días con guía que aún no marcamos como entregados; cuando la paquetería dice "delivered" anota
// `envio.entregado_en` (hora de la entrega según Skydropx). El bot vendedor la llama cada ~2 h y con
// eso le pide su opinión a la clienta por WhatsApp. Acepta x-bot-secret o CRON_SECRET.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function autorizado(req: Request): boolean {
  if (esBotAutorizado(req)) return true;
  const secret = process.env.CRON_SECRET || "";
  if (!secret) return false;
  const auth = req.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
}

const entregado = (s: string) => /^delivered$|entregad/i.test(s || "");

async function revisar() {
  const sb = createAdminSupabase();
  const desde = Date.now() - 30 * 24 * 3600 * 1000;
  const { data: ordenes, error } = await sb
    .from("ordenes_web")
    .select("id, envio, enviado, enviado_en")
    .like("status", "pagado%")
    .gte("fecha_pago", desde)
    .not("guia_tracking", "is", null)
    .limit(200);
  if (error) throw new Error(error.message);

  const pend = (ordenes || []).filter((o) => {
    const e = (o.envio || {}) as Record<string, unknown>;
    return e.guia_shipment_id && !e.entregado_en;
  });

  const entregados: Array<{ id: string; entregado_en: number }> = [];
  const errores: Array<{ id: string; error: string }> = [];
  for (const o of pend) {
    const e = o.envio as Record<string, unknown>;
    try {
      const res = await skydropxFetch("/shipments/" + String(e.guia_shipment_id));
      if (!res.ok) {
        errores.push({ id: o.id, error: `GET ${res.status}` });
        continue;
      }
      const j = await res.json();
      const pkg = ((j.included || []).find((i: Record<string, unknown>) => i.type === "package")
        ?.attributes || {}) as Record<string, unknown>;
      if (!entregado(String(pkg.tracking_status || ""))) continue;
      const cuando = Date.parse(String(pkg.updated_at || "")) || Date.now();
      await sb
        .from("ordenes_web")
        .update({
          envio: { ...e, entregado_en: cuando },
          ...(o.enviado ? {} : { enviado: true, enviado_en: o.enviado_en || cuando }),
        })
        .eq("id", o.id);
      entregados.push({ id: o.id, entregado_en: cuando });
    } catch (err) {
      errores.push({ id: o.id, error: String(err) });
    }
  }
  return { revisados: pend.length, entregados, errores };
}

export async function POST(req: Request) {
  if (!autorizado(req)) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  if (!skydropxConfigurado()) {
    return NextResponse.json({ error: "skydropx no configurado" }, { status: 503 });
  }
  try {
    return NextResponse.json({ ok: true, ...(await revisar()) });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return POST(req);
}
