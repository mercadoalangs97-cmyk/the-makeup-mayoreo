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
import { enviarCorreoGuia, type OrdenCorreo } from "../../../lib/email";

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

// La API de Skydropx Pro responde en formato JSON:API:
//   { data:{ id, attributes:{ carrier_name, workflow_status, total, master_tracking_number } },
//     included:[{ type:"package", attributes:{ label_url, tracking_number, tracking_url_provider } }] }
// Además la ETIQUETA se genera de forma ASÍNCRONA: hay que esperar workflow_status "success".
type DatosGuiaSky = {
  workflow_status: string;
  shipmentId: string;
  label_url: string | null;
  tracking: string;
  tracking_url: string | null;
  carrier: string;
  total: number | null;
};
function extraerDatosGuia(j: Record<string, unknown>): DatosGuiaSky {
  const data = (j?.data ?? j) as Record<string, unknown>;
  const attrs = (data?.attributes ?? {}) as Record<string, unknown>;
  const included = (j?.included ?? []) as Array<Record<string, unknown>>;
  const pkg = (included.find((i) => i.type === "package")?.attributes ??
    {}) as Record<string, unknown>;
  return {
    workflow_status: String(attrs.workflow_status ?? ""),
    shipmentId: String(data?.id ?? ""),
    label_url: (pkg.label_url as string) || null,
    tracking: String(pkg.tracking_number || attrs.master_tracking_number || ""),
    tracking_url: (pkg.tracking_url_provider as string) || null,
    carrier: String(attrs.carrier_name ?? ""),
    total: attrs.total != null ? Number(attrs.total) : null,
  };
}
// Polling hasta que la etiqueta esté lista (máx ~15s). Solo lectura → NO cuesta.
async function esperarGuiaLista(shipmentId: string): Promise<DatosGuiaSky | null> {
  for (let i = 0; i < 8; i++) {
    await new Promise((r) => setTimeout(r, 1800));
    const res = await skydropxFetch("/shipments/" + shipmentId);
    if (res.ok) {
      const d = extraerDatosGuia(await res.json());
      if (d.label_url || d.workflow_status === "success" || d.workflow_status === "error") {
        return d;
      }
    }
  }
  return null;
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

  // Valor declarado de la mercancía, repartido entre las cajas. `orden.total`
  // es el subtotal de producto (sin envío), que es justo lo que se asegura.
  const valorMercancia = Math.max(1, Math.round(Number(orden.total) || 0));
  const valorPorPaquete = Math.max(1, Math.round(valorMercancia / parcels.length));

  // ---- OPCIONES: cotiza (GRATIS) y devuelve paqueterías + recomendada ----
  if (body.accion === "opciones") {
    const todas = await cotizarEnvioReal(destino, parcels);
    const rates = filtrarPaqueterias(todas);
    if (!rates.length) return json({ error: "Sin paqueterías disponibles para ese C.P." }, 502);
    let recomendada = rates[0].servicioCode; // AMARÉA: la más barata
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
          phone: ORIGEN.telefono, email: "ventas@themakeup.com.mx",
          // Skydropx exige reference: no vacío y MÁX 30 caracteres.
          reference: ORIGEN.referencia.slice(0, 30),
        },
        address_to: {
          country_code: "MX", postal_code: env.cp,
          area_level1: env.estado, area_level2: env.ciudad, area_level3: env.colonia,
          name: orden.cliente || env.nombre || "Cliente",
          street1: (env.calle || "") + " " + (env.numero || ""),
          phone: orden.wpp || env.telefono || "",
          email: orden.email || env.email || "ventas@themakeup.com.mx",
          // no vacío y MÁX 30 caracteres
          reference: (env.referencias || "Sin referencia").slice(0, 30),
        },
        // package_number debe coincidir con el de la cotización (1, 2, 3… por orden).
        // package_type "4G" = caja de cartón corrugado (código SAT que Skydropx acepta;
        // "my_own_box" quedó fuera de su lista).
        // declared_value: obligatorio desde que Skydropx activó la "Protección
        // obligatoria". Va el valor REAL de la mercancía (el total de producto
        // del pedido, sin el envío), repartido entre las cajas. Declarar de
        // menos abarata el seguro pero deja el paquete sin cobertura real, así
        // que se declara lo que vale.
        packages: parcels.map((p, i) => ({
          ...p,
          package_number: i + 1,
          consignment_note: claveSat,
          package_type: "4G",
          declared_value: valorPorPaquete,
        })),
      },
    };

    const res = await skydropxFetch("/shipments", { method: "POST", body: JSON.stringify(payload) });
    const j = await res.json();
    if (!res.ok) {
      return json({ error: "Skydropx rechazó la guía", detalle: j.errors || j.message || j }, 502);
    }

    // La respuesta es JSON:API y la etiqueta puede tardar unos segundos.
    let datos = extraerDatosGuia(j);
    if (!datos.label_url && datos.shipmentId) {
      const listo = await esperarGuiaLista(datos.shipmentId);
      if (listo) datos = listo;
    }
    if (datos.workflow_status === "error") {
      return json({ error: "Skydropx no pudo generar la etiqueta.", detalle: j }, 502);
    }

    const cost = datos.total != null ? Math.round(datos.total) : Math.round(rate.total);
    const paqueteria = datos.carrier || rate.proveedor;

    await supabase.from("ordenes_web").update({
      guia_url: datos.label_url,
      guia_tracking: datos.tracking,
      envio: {
        ...env,
        guia_shipment_id: datos.shipmentId,
        guia_tracking_url: datos.tracking_url,
        guia_costo_real: cost,
        guia_paqueteria: paqueteria,
        guia_servicio: rate.servicio,
      },
    }).eq("id", body.ordenId);

    // Mejora B: correo automático al cliente con su guía + rastreo (best-effort).
    try {
      await enviarCorreoGuia(orden as OrdenCorreo, {
        tracking: datos.tracking,
        trackingUrl: datos.tracking_url,
        paqueteria,
      });
    } catch (e) {
      console.error("[guia] correo de guía falló:", e);
    }

    return json({
      ok: true,
      label_url: datos.label_url,
      tracking: datos.tracking,
      tracking_url: datos.tracking_url,
      cost,
      paqueteria,
      servicio: rate.servicio,
      shipmentId: datos.shipmentId,
    });
  }

  // ---- CANCELAR: la API de Skydropx Pro NO expone cancelación (rutas 404).
  // La cancelación + reembolso se hacen en el panel de Skydropx. Este endpoint
  // ya NO llama a Skydropx (antes tronaba con HTML 404 → "Error de conexión").
  // La app muestra instrucciones y abre el panel.
  if (body.accion === "cancelar") {
    return json({
      ok: false,
      cancelar_en_panel: true,
      mensaje:
        "La cancelación se realiza en el panel de Skydropx: Envíos → localiza la guía → botón verde → Cancelar guía.",
    });
  }

  return json({ error: "Acción no válida" }, 400);
}
