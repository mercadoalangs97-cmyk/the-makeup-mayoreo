import { NextResponse } from "next/server";
import { createAdminSupabase } from "../../../lib/supabase";
import { skydropxFetch, skydropxConfigurado } from "../../../lib/skydropx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Estatus de tracking de Skydropx que significan "la paquetería YA lo tiene"
// (recolectado / en tránsito / entregado) → el pedido pasa a "enviado".
// NO dispara con "created" ni "label_created" (aún sin recoger).
function yaEnCamino(status: string): boolean {
  return /transit|collect|pick|delivery|delivered|shipped|recolect|transito|entreg|camino|ruta/i.test(
    status || ""
  );
}

// Protección: Vercel Cron manda `Authorization: Bearer <CRON_SECRET>` automático.
// También se acepta `?secret=` para disparadores externos (ej. Railway).
function autorizado(req: Request): boolean {
  const secret = process.env.CRON_SECRET || "";
  if (!secret) return false;
  const auth = req.headers.get("authorization") || "";
  const qs = new URL(req.url).searchParams.get("secret") || "";
  return auth === `Bearer ${secret}` || qs === secret;
}

async function sync() {
  const supabase = createAdminSupabase();
  // Pedidos con guía pero NO marcados como enviados.
  const { data: ordenes } = await supabase
    .from("ordenes_web")
    .select("id, envio, guia_tracking, enviado")
    .neq("enviado", true)
    .not("guia_tracking", "is", null);

  const pend = (ordenes || []).filter(
    (o) => (o.envio as Record<string, unknown> | null)?.guia_shipment_id
  );

  const detalle: Array<Record<string, unknown>> = [];
  let marcados = 0;

  for (const o of pend) {
    const shipmentId = String(
      (o.envio as Record<string, unknown>).guia_shipment_id
    );
    try {
      const res = await skydropxFetch("/shipments/" + shipmentId);
      if (!res.ok) {
        detalle.push({ id: o.id, error: `GET ${res.status}` });
        continue;
      }
      const j = await res.json();
      const pkg = ((j.included || []).find(
        (i: Record<string, unknown>) => i.type === "package"
      )?.attributes || {}) as Record<string, unknown>;
      const status = String(pkg.tracking_status || "");
      if (yaEnCamino(status)) {
        await supabase
          .from("ordenes_web")
          .update({ enviado: true, enviado_en: Date.now() })
          .eq("id", o.id);
        marcados++;
        detalle.push({ id: o.id, status, marcado: true });
      } else {
        detalle.push({ id: o.id, status, marcado: false });
      }
    } catch (e) {
      detalle.push({ id: o.id, error: String(e) });
    }
  }
  return { revisados: pend.length, marcados, detalle };
}

export async function GET(req: Request) {
  if (!autorizado(req)) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  if (!skydropxConfigurado()) {
    return NextResponse.json({ error: "skydropx no configurado" }, { status: 503 });
  }
  const r = await sync();
  return NextResponse.json({ ok: true, ...r });
}

export async function POST(req: Request) {
  return GET(req);
}
