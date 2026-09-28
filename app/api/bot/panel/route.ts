import { NextResponse } from "next/server";
import { createAdminSupabase, createServerSupabase } from "../../../lib/supabase";

// Datos y acciones del PANEL del bot vendedor (/panel-bot). Lee las tablas
// mk_* del bot con la service role y, para lo que necesita al bot vivo
// (mandar un texto, aprobar una propuesta), le habla al servicio en Railway
// con el BOT_SECRET. Protegido con la sesión de Supabase Auth del personal
// (los mismos usuarios del panel de inventario).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function usuario(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  try {
    const { data, error } = await createServerSupabase().auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

const j = (data: unknown, status = 200) => NextResponse.json(data, { status });

export async function GET(req: Request) {
  if (!(await usuario(req))) return j({ error: "Sesión no válida" }, 401);
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";
  const sb = createAdminSupabase();
  try {
    if (q === "conversaciones") {
      const desde = new Date(Date.now() - 45 * 86400_000).toISOString();
      const [{ data: conv }, { data: pend }, { data: modo }] = await Promise.all([
        sb.from("mk_conversaciones").select("*").gte("actualizada", desde).order("ultimo_cliente_en", { ascending: false, nullsFirst: false }).limit(200),
        sb.from("mk_pendientes").select("id,canal_id,texto,adjunto,creado").order("id"),
        sb.from("mk_config").select("valor").eq("clave", "modo").maybeSingle(),
      ]);
      return j({ conversaciones: conv || [], pendientes: pend || [], modo: modo?.valor || "copiloto" });
    }
    if (q === "mensajes") {
      const canal = url.searchParams.get("canal") || "";
      if (!canal) return j({ error: "Falta canal" }, 400);
      const [{ data: msgs }, { data: conv }] = await Promise.all([
        sb.from("mk_mensajes").select("id,direccion,tipo,texto,media,por,creado").eq("canal_id", canal).order("creado", { ascending: false }).limit(150),
        sb.from("mk_conversaciones").select("*").eq("canal_id", canal).maybeSingle(),
      ]);
      let cotizacion = null;
      if (conv?.cotizacion_id) {
        const { data } = await sb.from("cotizaciones").select("id,total,subtotal,envio_costo,envio_paqueteria,vistas,pago_click_en,pagada,orden_id,transferencia_aviso_en,apartado_monto,cliente_nombre,items").eq("id", conv.cotizacion_id).maybeSingle();
        cotizacion = data;
      }
      let lote = null;
      if (conv?.lote_id) {
        const { data } = await sb.from("mk_lotes").select("id,nombre,piezas,precio,estado,fotos,apartado_hasta").eq("id", conv.lote_id).maybeSingle();
        lote = data;
      }
      return j({ mensajes: (msgs || []).reverse(), conversacion: conv, cotizacion, lote });
    }
    if (q === "lotes") {
      const { data } = await sb.from("mk_lotes").select("*").order("creado_en", { ascending: false }).limit(300);
      return j({ lotes: data || [] });
    }
    if (q === "cotizaciones") {
      const desde = new Date(Date.now() - 45 * 86400_000).toISOString();
      const { data: cb } = await sb.from("mk_cotizaciones").select("*").gte("creada", desde).order("creada", { ascending: false }).limit(200);
      const ids = (cb || []).map((c) => c.id);
      const { data: sitio } = ids.length ? await sb.from("cotizaciones").select("id,cliente_nombre,total,vistas,pago_click_en,pagada,orden_id,transferencia_aviso_en,apartado_monto,envio").in("id", ids) : { data: [] };
      const porId = new Map((sitio || []).map((c) => [c.id, c]));
      return j({ cotizaciones: (cb || []).map((c) => ({ ...c, sitio: porId.get(c.id) || null })) });
    }
    return j({ error: "q desconocida" }, 400);
  } catch (e) {
    return j({ error: (e as Error).message }, 500);
  }
}

// Acciones que necesitan al bot vivo → se reenvían al servicio en Railway.
const BOT_URL = (process.env.BOT_URL || "https://makeup-bot-production.up.railway.app").replace(/\/$/, "");

export async function POST(req: Request) {
  const u = await usuario(req);
  if (!u) return j({ error: "Sesión no válida" }, 401);
  let body: { accion?: string } & Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return j({ error: "JSON inválido" }, 400);
  }
  const accion = String(body.accion || "");
  const rutas: Record<string, string> = { enviar: "/admin/enviar", pendiente: "/admin/pendiente", estado: "/admin/estado", modo: "/admin/modo", lote: "/admin/lote", seguimiento: "/admin/seguimiento" };
  const ruta = rutas[accion];
  if (!ruta) return j({ error: "acción desconocida" }, 400);
  if (!process.env.BOT_SECRET) return j({ error: "Falta BOT_SECRET en el servidor" }, 503);
  try {
    const r = await fetch(BOT_URL + ruta, {
      method: "POST",
      headers: { "content-type": "application/json", "x-bot-secret": process.env.BOT_SECRET },
      body: JSON.stringify({ ...body, por: "panel", usuario: u.email || u.id }),
      signal: AbortSignal.timeout(30_000),
    });
    const txt = await r.text();
    let data: unknown = {};
    try {
      data = txt ? JSON.parse(txt) : {};
    } catch {
      data = { error: txt.slice(0, 200) };
    }
    return j(data, r.status);
  } catch (e) {
    return j({ error: "El bot no respondió: " + (e as Error).message }, 502);
  }
}
