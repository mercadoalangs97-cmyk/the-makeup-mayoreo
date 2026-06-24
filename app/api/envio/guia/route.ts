import { NextResponse } from "next/server";
import { createAdminSupabase, createServerSupabase } from "../../../lib/supabase";
import {
  cotizarEnvioReal,
  filtrarPaqueterias,
  skydropxFetch,
  skydropxConfigurado,
  ORIGEN,
} from "../../../lib/skydropx";
import { parcelsDeItems } from "../../../lib/lotes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// La app de inventario (otro dominio) llama este endpoint → CORS abierto, pero
// SIEMPRE protegido por el token de sesión Supabase (solo personal logueado).
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: CORS });
}
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// Busca recursivamente una URL de etiqueta (PDF) en la respuesta de Skydropx
function buscarLabelUrl(obj: unknown): string | null {
  if (!obj) return null;
  if (typeof obj === "string") {
    return /^https?:\/\/\S+\.(pdf|png)/i.test(obj) || /label/i.test(obj) ? obj : null;
  }
  if (Array.isArray(obj)) {
    for (const v of obj) { const r = buscarLabelUrl(v); if (r) return r; }
    return null;
  }
  if (typeof obj === "object") {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (/label.*url|url.*label|label_url/i.test(k) && typeof v === "string") return v;
      const r = buscarLabelUrl(v); if (r) return r;
    }
  }
  return null;
}
function buscarTracking(obj: Record<string, unknown>): string {
  return String(
    obj.tracking_number || obj.master_tracking_number || obj.tracking || ""
  );
}

async function verificarUsuario(token: string | undefined) {
  if (!token) return null;
  try {
    const sb = createServerSupabase();
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  if (!skydropxConfigurado()) {
    return json({ error: "Skydropx no está configurado en el servidor." }, 503);
  }

  let body: {
    ordenId?: string;
    accion?: "opciones" | "crear" | "cancelar";
    servicioCode?: string;
    token?: string;
    paquete?: { length: number; width: number; height: number; weight: number };
    claveSat?: string;
  };
  try { body = await req.json(); } catch { return json({ error: "JSON inválido" }, 400); }

  const user = await verificarUsuario(body.token);
  if (!user) return json({ error: "No autorizado. Inicia sesión de nuevo." }, 401);

  const supabase = createAdminSupabase();
  const { data: orden, error } = await supabase
    .from("ordenes_web").select("*").eq("id", body.ordenId).single();
  if (error || !orden) return json({ error: "Pedido no encontrado" }, 404);

  const env = (orden.envio || {}) as Record<string, string>;
  const destino = {
    cp: env.cp || "", estado: env.estado || "",
    ciudad: env.ciudad || "", colonia: env.colonia || "",
  };
  const itemsModo = ((orden.items || []) as Array<Record<string, unknown>>).map((it) => ({
    tipo: it.tipo as "lote" | "producto",
    id: it.tipo === "lote" ? "lote:" + it.ref : "prod:" + it.ref,
    qty: Number(it.qty) || 1,
    piezas: Number(it.piezas) || 0,
  }));
  const hayLote = itemsModo.some((i) => i.tipo === "lote");
  // El usuario puede elegir el tamaño de paquete en el modal; si lo manda, manda.
  const parcels = body.paquete
    ? [body.paquete]
    : hayLote
    ? parcelsDeItems(itemsModo)
    : [{ length: 20, width: 15, height: 10, weight: 0.5 }];
  const claveSat = (body.claveSat || "53131619").trim(); // Cosméticos (SAT Anexo 20 v4.0)

  // ---- OPCIONES: cotiza (GRATIS) y devuelve paqueterías + recomendada ----
  if (body.accion === "opciones") {
    const todas = await cotizarEnvioReal(destino, parcels);
    const rates = filtrarPaqueterias(todas);
    if (!rates.length) return json({ error: "Sin paqueterías disponibles para ese C.P." }, 502);
    let recomendada = rates[0].servicioCode; // AMAREA: la más barata
    if (hayLote && env.servicio_code) {
      const m = rates.find((r) => r.servicioCode === env.servicio_code);
      if (m) recomendada = m.servicioCode; // LOTE: la que eligió el cliente
    }
    return json({
      modo: hayLote ? "lote" : "amarea",
      fija: hayLote, // en lote no se cambia de paquetería
      recomendada,
      opciones: rates.map((r) => ({
        proveedor: r.proveedor, servicio: r.servicio, servicioCode: r.servicioCode,
        total: Math.round(r.total), dias: r.dias,
      })),
    });
  }

  // ---- CREAR: genera la guía REAL (COBRA saldo Skydropx) ----
  if (body.accion === "crear") {
    if (orden.guia_url) {
      return json({ error: "Este pedido ya tiene guía.", label_url: orden.guia_url }, 409);
    }
    const todas = await cotizarEnvioReal(destino, parcels);
    const rates = filtrarPaqueterias(todas);
    const sc = body.servicioCode || (hayLote ? env.servicio_code : "") || (rates[0]?.servicioCode);
    const rate = rates.find((r) => r.servicioCode === sc) || rates[0];
    if (!rate) return json({ error: "No se pudo cotizar para crear la guía." }, 502);

    const payload = {
      shipment: {
        rate_id: rate.rateId,
        address_from: {
          country_code: "MX", postal_code: ORIGEN.cp,
          area_level1: ORIGEN.area_level1, area_level2: ORIGEN.area_level2, area_level3: ORIGEN.area_level3,
          name: ORIGEN.nombre, company: ORIGEN.nombre,
          street1: ORIGEN.calle + " " + ORIGEN.numero,
          phone: ORIGEN.telefono, email: "ventas@themakeup.com.mx", reference: "",
        },
        address_to: {
          country_code: "MX", postal_code: env.cp,
          area_level1: env.estado, area_level2: env.ciudad, area_level3: env.colonia,
          name: orden.cliente || env.nombre || "Cliente",
          street1: (env.calle || "") + " " + (env.numero || ""),
          phone: orden.wpp || env.telefono || "",
          email: orden.email || env.email || "ventas@themakeup.com.mx",
          reference: env.referencias || "",
        },
        packages: parcels.map((p) => ({
          ...p, consignment_note: claveSat, package_type: "my_own_box",
        })),
      },
    };

    const res = await skydropxFetch("/shipments", { method: "POST", body: JSON.stringify(payload) });
    const j = await res.json();
    if (!res.ok) {
      return json({ error: "Skydropx rechazó la guía", detalle: j.errors || j.message || j }, 502);
    }
    const label_url = buscarLabelUrl(j);
    const tracking = buscarTracking(j as Record<string, unknown>);
    const shipmentId = String((j as Record<string, unknown>).id || "");
    const cost = Math.round(rate.total);

    await supabase.from("ordenes_web").update({
      guia_url: label_url,
      guia_tracking: tracking,
      envio: { ...env, guia_shipment_id: shipmentId, guia_costo_real: cost, guia_paqueteria: rate.proveedor, guia_servicio: rate.servicio },
    }).eq("id", body.ordenId);

    return json({
      ok: true, label_url, tracking, cost,
      paqueteria: rate.proveedor, servicio: rate.servicio, shipmentId,
      raw: j, // para verificar la forma en la primera prueba real
    });
  }

  // ---- CANCELAR: solicita la cancelación de la guía ----
  if (body.accion === "cancelar") {
    const shipmentId = String(env.guia_shipment_id || "");
    if (!shipmentId) return json({ error: "Este pedido no tiene guía para cancelar." }, 400);
    const res = await skydropxFetch("/cancellations", {
      method: "POST",
      body: JSON.stringify({ cancellation: { shipment_ids: [shipmentId], reason: "no_usada" } }),
    });
    const j = await res.json();
    if (!res.ok) {
      return json({ error: "No se pudo solicitar la cancelación.", detalle: j.errors || j.message || j }, 502);
    }
    await supabase.from("ordenes_web").update({
      guia_url: null, guia_tracking: null,
      envio: { ...env, guia_cancelada: true },
    }).eq("id", body.ordenId);
    return json({ ok: true, mensaje: "Cancelación solicitada. El reembolso lo procesa Skydropx (puede tardar).", raw: j });
  }

  return json({ error: "Acción no válida" }, 400);
}
