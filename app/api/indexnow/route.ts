import { NextResponse } from "next/server";
import { createAdminSupabase, createServerSupabase } from "../../lib/supabase";
import { avisarIndexNow, urlProducto } from "../../lib/indexnow";
import { SITE_URL } from "../../lib/site";

// Aviso a Bing (IndexNow) de lo que publicamos.
//   GET  → lo llama el cron: busca los productos nuevos del último día y avisa.
//   POST → aviso manual de URLs concretas (desde la app de inventario).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

function autorizadoCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET || "";
  if (!secret) return false;
  const auth = req.headers.get("authorization") || "";
  const qs = new URL(req.url).searchParams.get("secret") || "";
  return auth === `Bearer ${secret}` || qs === secret;
}

async function usuarioValido(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const sb = createServerSupabase();
    const { data, error } = await sb.auth.getUser(token);
    return !error && !!data?.user;
  } catch {
    return false;
  }
}

// ---- Cron diario: avisa de los productos publicados en las últimas 26 h ----
export async function GET(req: Request) {
  if (!autorizadoCron(req)) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }

  const desde = Date.now() - 26 * 60 * 60 * 1000; // 26 h: cubre el hueco entre corridas
  const sb = createAdminSupabase();
  const { data, error } = await sb
    .from("productos")
    .select("sku")
    .gte("creado_en", desde)
    .gt("stock", 0)
    .not("foto", "is", null)
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const nuevos = (data || []).map((p) => urlProducto(p.sku));
  if (nuevos.length === 0) {
    return NextResponse.json({ ok: true, nuevos: 0, aviso: "nada_nuevo" });
  }

  // Si hubo altas, los listados también cambiaron: que los revisen.
  const urls = [...nuevos, SITE_URL, `${SITE_URL}/amarea`];
  const r = await avisarIndexNow(urls);
  return NextResponse.json({ ok: r.ok, status: r.status, enviadas: r.enviadas });
}

// ---- Aviso manual de URLs concretas ----
export async function POST(req: Request) {
  let body: { secret?: string; token?: string; urls?: string[]; skus?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400, headers: CORS });
  }

  const okCron =
    !!process.env.CRON_SECRET && body.secret === process.env.CRON_SECRET;
  if (!okCron && !(await usuarioValido(body.token))) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401, headers: CORS });
  }

  const urls = [
    ...(body.urls || []),
    ...(body.skus || []).map((s) => urlProducto(s)),
  ];
  const r = await avisarIndexNow(urls);
  return NextResponse.json(
    { ok: r.ok, status: r.status, enviadas: r.enviadas, detalle: r.detalle },
    { status: r.ok ? 200 : 502, headers: CORS }
  );
}
