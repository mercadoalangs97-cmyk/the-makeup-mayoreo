import { NextResponse } from "next/server";
import { createAdminSupabase, createServerSupabase } from "../../../lib/supabase";

// Datos y acciones del PANEL del bot vendedor (/panel-bot). Lee las tablas
// mk_* del bot con la service role y, para lo que necesita al bot vivo
// (mandar un texto, aprobar una propuesta), le habla al servicio en Railway
// con el BOT_SECRET. Protegido con la sesión de Supabase Auth del personal
// (los mismos usuarios del panel de inventario).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Usuario = { id: string; email?: string | null };
const sesiones = new Map<string, { u: Usuario; hasta: number }>();

/** Vence el token según su propio `exp` (JWT); si no se puede leer, 5 min. */
function venceToken(token: string) {
  try {
    const exp = Number(JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).exp) * 1000;
    if (exp) return exp;
  } catch { /* token raro: se usa el tope */ }
  return Date.now() + 5 * 60_000;
}

async function usuario(req: Request): Promise<Usuario | null> {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  // Un token ya verificado se recuerda hasta 5 min (y nunca más allá de su vencimiento): el panel
  // pregunta cada 10 s y cada vuelta a Supabase Auth costaba ~0.3 s.
  const ya = sesiones.get(token);
  if (ya && ya.hasta > Date.now()) return ya.u;
  try {
    const { data, error } = await createServerSupabase().auth.getUser(token);
    if (error || !data?.user) return null;
    const u = { id: data.user.id, email: data.user.email };
    if (sesiones.size > 200) sesiones.clear();
    sesiones.set(token, { u, hasta: Math.min(Date.now() + 5 * 60_000, venceToken(token)) });
    return u;
  } catch {
    return null;
  }
}

const j = (data: unknown, status = 200) => NextResponse.json(data, { status });

type Sb = ReturnType<typeof createAdminSupabase>;
const tel10 = (v: unknown) => String(v ?? "").replace(/\D/g, "").slice(-10);

/** Campos de la ficha de la clienta que el equipo puede editar desde el panel (el bot también los llena). */
const CAMPOS_CLIENTA = ["nombre", "telefono", "email", "calle", "numero", "colonia", "cp", "municipio", "estado", "referencias"] as const;

/** Nombre corto de quien usa el panel, para firmar sus mensajes ("Mar · panel"). */
function nombreDe(email: string | null | undefined) {
  const e = String(email || "").toLowerCase();
  if (e.startsWith("mar.") || e.startsWith("mar@")) return "Mar";
  if (e.includes("alan")) return "Alan";
  const p = e.split("@")[0].split(/[._-]/)[0];
  return p ? p[0].toUpperCase() + p.slice(1) : "Equipo";
}

type MapaCompras = Map<string, { n: number; total: number; ultima: number; nombre: string | null; detalle: { total: number; fecha: number; que: string }[] }>;
let comprasCache: { hasta: number; p: Promise<MapaCompras> } | null = null;

/** Igual que leerComprasPorTelefono, pero recordada 60 s (y una sola lectura aunque lleguen varias peticiones juntas). */
function comprasPorTelefono(sb: Sb): Promise<MapaCompras> {
  if (comprasCache && comprasCache.hasta > Date.now()) return comprasCache.p;
  const p = leerComprasPorTelefono(sb).catch((e) => { comprasCache = null; throw e; });
  comprasCache = { hasta: Date.now() + 60_000, p };
  return p;
}

/** Compras pagadas en la web y por el bot, agrupadas por teléfono a 10 dígitos. */
async function leerComprasPorTelefono(sb: Sb): Promise<MapaCompras> {
  const { data } = await sb.from("ordenes_web").select("id,total,wpp,envio,fecha_pago,creado_en,cliente,items").eq("status", "pagado").order("creado_en", { ascending: false }).limit(1000);
  const m = new Map<string, { n: number; total: number; ultima: number; nombre: string | null; detalle: { total: number; fecha: number; que: string }[] }>();
  for (const o of data || []) {
    const env = (o.envio || {}) as Record<string, unknown>;
    const t = tel10(o.wpp) || tel10(env.telefono);
    if (t.length !== 10) continue;
    const fecha = Number(o.fecha_pago || o.creado_en) || 0;
    const que = ((o.items || []) as { nombre?: string; ref?: string; qty?: number }[]).map((i) => `${(i.qty ?? 1) > 1 ? i.qty + "× " : ""}${i.nombre || i.ref}`).join(" + ");
    const x = m.get(t) || { n: 0, total: 0, ultima: 0, nombre: (o.cliente as string | null) || null, detalle: [] as { total: number; fecha: number; que: string }[] };
    x.n++; x.total += Number(o.total) || 0; x.ultima = Math.max(x.ultima, fecha); x.detalle.push({ total: Number(o.total) || 0, fecha, que });
    m.set(t, x);
  }
  return m;
}

/**
 * Etapa del CRM calculada con lo que ya se sabe (no hay que capturar nada):
 * nueva → interesada → cotizada → apartada → clienta → recompra; perdida si dijo que no.
 */
function etapaDe(c: Record<string, unknown>, cot: Record<string, unknown> | null, compras: number) {
  const r = (c.resumen || {}) as Record<string, unknown>;
  if (cot?.pagada) return compras >= 2 ? "recompra" : "clienta";
  if (compras >= 1) return "recompra"; // ya compró antes y volvió a escribir
  if (r.noInteresadaEn) return "perdida";
  if (Number(cot?.apartado_monto) > 0) return "apartada";
  if (cot) return "cotizada";
  if (c.lote_id || r.interes) return "interesada";
  return "nueva";
}

export async function GET(req: Request) {
  if (!(await usuario(req))) return j({ error: "Sesión no válida" }, 401);
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";
  const sb = createAdminSupabase();
  try {
    if (q === "version") return j({ version: process.env.PANEL_VERSION || "" });
    if (q === "conversaciones") {
      const desde = new Date(Date.now() - 45 * 86400_000).toISOString();
      const [{ data: conv }, { data: pend }, { data: modo }] = await Promise.all([
        sb.from("mk_conversaciones").select("*").gte("actualizada", desde).order("ultimo_cliente_en", { ascending: false, nullsFirst: false }).limit(200),
        sb.from("mk_pendientes").select("id,canal_id,texto,adjunto,creado").order("id"),
        sb.from("mk_config").select("valor").eq("clave", "modo").maybeSingle(),
      ]);
      const lista = conv || [];
      const ids = lista.map((c) => c.cotizacion_id).filter(Boolean) as string[];
      const [{ data: cots }, compras] = await Promise.all([
        ids.length ? sb.from("cotizaciones").select("id,pagada,apartado_monto,total").in("id", ids) : Promise.resolve({ data: [] as Record<string, unknown>[] }),
        comprasPorTelefono(sb),
      ]);
      const cotPorId = new Map((cots || []).map((x) => [String(x.id), x as Record<string, unknown>]));
      const enriquecidas = lista.map((c) => {
        const cp = compras.get(tel10(c.telefono));
        const cot = c.cotizacion_id ? cotPorId.get(String(c.cotizacion_id)) || null : null;
        return { ...c, etapa: etapaDe(c, cot, cp?.n ?? 0), compras: cp?.n ?? 0, total_compras: cp?.total ?? 0 };
      });
      return j({ conversaciones: enriquecidas, pendientes: pend || [], modo: modo?.valor || "copiloto" });
    }
    if (q === "mensajes") {
      const canal = url.searchParams.get("canal") || "";
      if (!canal) return j({ error: "Falta canal" }, 400);
      // Ronda 1 (en paralelo): mensajes, conversación, cotizaciones del bot y compras (en caché).
      const [{ data: msgs }, { data: conv }, { data: cbs }, compras] = await Promise.all([
        sb.from("mk_mensajes").select("id,direccion,tipo,texto,media,por,creado,ext_id").eq("canal_id", canal).order("creado", { ascending: false }).limit(150),
        sb.from("mk_conversaciones").select("*").eq("canal_id", canal).maybeSingle(),
        sb.from("mk_cotizaciones").select("id,lote_id,total,link,creada,seguimientos,cerrada").eq("canal_id", canal).order("creada", { ascending: false }).limit(10),
        comprasPorTelefono(sb),
      ]);
      // Ronda 2 (en paralelo): lo que depende de la conversación.
      const t = tel10(conv?.telefono);
      const idsCot = [...new Set([...(cbs || []).map((c) => c.id), ...(conv?.cotizacion_id ? [conv.cotizacion_id] : [])])];
      const [{ data: sitioCots }, { data: lote }, { data: fichas }] = await Promise.all([
        idsCot.length ? sb.from("cotizaciones").select("id,total,vistas,pago_click_en,pagada,orden_id,transferencia_aviso_en,apartado_monto,envio_paqueteria,cliente_nombre").in("id", idsCot) : Promise.resolve({ data: [] as Record<string, unknown>[] }),
        conv?.lote_id ? sb.from("mk_lotes").select("id,nombre,piezas,precio,estado,fotos,apartado_hasta").eq("id", conv.lote_id).maybeSingle() : Promise.resolve({ data: null }),
        sb.from("mk_clientes").select("clave,nombre,telefono,email,calle,numero,colonia,cp,municipio,estado,referencias,notas,actualizada").or(`clave.eq.${t || "x"},clave.eq.${canal}`).limit(2),
      ]);
      const cp = compras.get(t);
      const sitioPorId = new Map((sitioCots || []).map((c) => [String(c.id), c]));
      const cotizacion = conv?.cotizacion_id ? sitioPorId.get(String(conv.cotizacion_id)) || null : null;
      const cotizaciones = (cbs || []).map((c) => ({ ...c, sitio: sitioPorId.get(c.id) || null }));
      // La clave de la ficha: el teléfono si lo hay (así la encuentra el bot), si no el canal.
      const ficha = (fichas || []).find((f) => f.clave === t) || (fichas || [])[0] || null;
      return j({ mensajes: (msgs || []).reverse(), conversacion: conv, cotizacion, lote, clienta: ficha, claveFicha: t.length === 10 ? t : canal, cotizaciones, compras: cp ? { n: cp.n, total: cp.total, ultima: cp.ultima, detalle: cp.detalle.slice(0, 10) } : null });
    }
    if (q === "clientes") {
      const [compras, { data: fichas }, { data: convs }] = await Promise.all([
        comprasPorTelefono(sb),
        sb.from("mk_clientes").select("clave,nombre,telefono,email,municipio,estado,notas,actualizada").order("actualizada", { ascending: false }).limit(500),
        sb.from("mk_conversaciones").select("canal_id,nombre,telefono,ultimo_cliente_en").limit(1000),
      ]);
      const porTel = new Map<string, { telefono: string; nombre: string | null; ciudad: string | null; notas: string | null; canal_id: string | null; ultimo_contacto: string | null; compras: number; total: number; ultima: number }>();
      const toma = (tel: string) => {
        if (!porTel.has(tel)) porTel.set(tel, { telefono: tel, nombre: null, ciudad: null, notas: null, canal_id: null, ultimo_contacto: null, compras: 0, total: 0, ultima: 0 });
        return porTel.get(tel)!;
      };
      for (const f of fichas || []) {
        const tel = tel10(f.telefono) || tel10(f.clave);
        if (tel.length !== 10) continue;
        const x = toma(tel);
        x.nombre ||= f.nombre; x.notas ||= f.notas; x.ciudad ||= [f.municipio, f.estado].filter(Boolean).join(", ") || null;
      }
      for (const c of convs || []) {
        const tel = tel10(c.telefono);
        if (tel.length !== 10) continue;
        const x = toma(tel);
        x.nombre ||= c.nombre; x.canal_id ||= c.canal_id;
        if ((c.ultimo_cliente_en || "") > (x.ultimo_contacto || "")) x.ultimo_contacto = c.ultimo_cliente_en;
      }
      for (const [tel, cp] of compras) {
        const x = toma(tel);
        x.nombre ||= cp.nombre; x.compras = cp.n; x.total = cp.total; x.ultima = cp.ultima;
      }
      const clientes = [...porTel.values()].sort((a, b) => b.compras - a.compras || (b.ultimo_contacto || "").localeCompare(a.ultimo_contacto || ""));
      return j({ clientes });
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
  // Adjunto desde el panel: se sube a Storage (bucket público lotes-fotos/panel) y se devuelve la URL.
  if ((req.headers.get("content-type") || "").includes("multipart/form-data")) {
    try {
      const form = await req.formData();
      const f = form.get("archivo");
      if (!(f instanceof File)) return j({ error: "Falta el archivo" }, 400);
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return j({ error: "Solo imágenes JPG, PNG o WebP" }, 415);
      if (f.size > 8 * 1024 * 1024) return j({ error: "La imagen pesa más de 8 MB" }, 413);
      const ext = f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg";
      const ruta = `panel/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const sb = createAdminSupabase();
      const { error } = await sb.storage.from("lotes-fotos").upload(ruta, Buffer.from(await f.arrayBuffer()), { contentType: f.type, upsert: false });
      if (error) return j({ error: "No se pudo subir: " + error.message }, 500);
      return j({ ok: true, url: sb.storage.from("lotes-fotos").getPublicUrl(ruta).data.publicUrl });
    } catch (e) {
      return j({ error: (e as Error).message }, 500);
    }
  }
  let body: { accion?: string } & Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return j({ error: "JSON inválido" }, 400);
  }
  const accion = String(body.accion || "");
  if (accion === "cliente") {
    const tel = tel10(body.telefonoConv);
    const canal = String(body.canalId || "");
    const clave = tel.length === 10 ? tel : canal;
    if (!clave) return j({ error: "Falta teléfono o canal" }, 400);
    const datos = (body.datos || {}) as Record<string, unknown>;
    const fila: Record<string, unknown> = { actualizada: new Date().toISOString() };
    for (const k of CAMPOS_CLIENTA) {
      if (!(k in datos)) continue;
      const v = String(datos[k] ?? "").trim().slice(0, 300);
      fila[k] = k === "cp" ? v.replace(/\D/g, "").slice(0, 5) || null : v || null;
    }
    const sb = createAdminSupabase();
    const { data: previa } = await sb.from("mk_clientes").select("clave").eq("clave", clave).maybeSingle();
    const { error } = previa
      ? await sb.from("mk_clientes").update(fila).eq("clave", clave)
      : await sb.from("mk_clientes").insert({ clave, canal_ids: canal ? [canal] : [], ...fila, telefono: fila.telefono ?? (tel.length === 10 ? tel : null) });
    if (error) return j({ error: error.message }, 500);
    return j({ ok: true });
  }
  if (accion === "nota") {
    const tel = tel10(body.telefono);
    const canal = String(body.canalId || "");
    const clave = tel.length === 10 ? tel : canal;
    if (!clave) return j({ error: "Falta teléfono o canal" }, 400);
    const sb = createAdminSupabase();
    const notas = String(body.notas ?? "").slice(0, 2000);
    const { data: previa } = await sb.from("mk_clientes").select("clave,canal_ids").eq("clave", clave).maybeSingle();
    const ahora = new Date().toISOString();
    const { error } = previa
      ? await sb.from("mk_clientes").update({ notas, actualizada: ahora }).eq("clave", clave)
      : await sb.from("mk_clientes").insert({ clave, telefono: tel.length === 10 ? tel : null, nombre: body.nombre ? String(body.nombre) : null, notas, canal_ids: canal ? [canal] : [], actualizada: ahora });
    if (error) return j({ error: error.message }, 500);
    return j({ ok: true });
  }
  const rutas: Record<string, string> = { enviar: "/admin/enviar", pendiente: "/admin/pendiente", estado: "/admin/estado", modo: "/admin/modo", lote: "/admin/lote", seguimiento: "/admin/seguimiento", borrar: "/admin/borrar", atendida: "/admin/atendida" };
  const ruta = rutas[accion];
  if (!ruta) return j({ error: "acción desconocida" }, 400);
  if (!process.env.BOT_SECRET) return j({ error: "Falta BOT_SECRET en el servidor" }, 503);
  try {
    const r = await fetch(BOT_URL + ruta, {
      method: "POST",
      headers: { "content-type": "application/json", "x-bot-secret": process.env.BOT_SECRET },
      body: JSON.stringify({ ...body, por: "panel", usuario: u.email || u.id, autor: nombreDe(u.email) }),
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
