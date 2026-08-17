import { NextResponse } from "next/server";
import { createAdminSupabase, createServerSupabase } from "../../../lib/supabase";
import { cotizarEnvioReal, filtrarPaqueterias,
  precioEnvioAlCliente,
} from "../../../lib/skydropx";
import { LOTES, parcelsDeItems, type Paquete } from "../../../lib/lotes";

// Crea una COTIZACIÓN desde la app de inventario (otro dominio → CORS abierto,
// pero protegido por el token de sesión Supabase: solo personal logueado).
// Cotiza el envío real con Skydropx y devuelve el link listo para WhatsApp.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

// Lo que la clienta tendrá que completar en el link antes de pagar.
function faltanDelCliente(envio: Record<string, string>): string[] {
  const falta: string[] = [];
  if (!envio.calle || !envio.numero) falta.push("calle y número");
  if (!envio.colonia) falta.push("colonia");
  if (!envio.nombre) falta.push("nombre");
  if ((envio.telefono || "").length !== 10) falta.push("teléfono");
  if (!envio.email) falta.push("correo");
  return falta;
}

// Código corto, fácil de dictar por teléfono (sin 0/O ni 1/I).
function codigoCorto(): string {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return s;
}

export async function POST(req: Request) {
  let body: {
    token?: string;
    loteId?: string;
    qty?: number;
    clienteNombre?: string;
    envio?: Record<string, string>;
    cotizarEnvio?: boolean;
    servicioCode?: string;
    paquete?: { length?: number; width?: number; height?: number; weight?: number };
    cajas?: number;
    /** Si viene, se ACTUALIZA esa cotización en vez de crear otra: el link que
     *  ya se mandó por WhatsApp sigue sirviendo y muestra lo nuevo. */
    id?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const user = await verificarUsuario(body.token);
  if (!user) return json({ error: "No autorizado. Inicia sesión de nuevo." }, 401);

  const lote = LOTES.find((l) => l.id === body.loteId);
  if (!lote) return json({ error: "Lote no válido." }, 400);

  const qty = Math.min(20, Math.max(1, Math.floor(Number(body.qty) || 1)));
  const e = body.envio || {};
  const envio = {
    nombre: (e.nombre || "").trim(),
    telefono: (e.telefono || "").replace(/\D/g, ""),
    email: (e.email || "").trim(),
    calle: (e.calle || "").trim(),
    numero: (e.numero || "").trim(),
    colonia: (e.colonia || "").trim(),
    cp: (e.cp || "").replace(/\D/g, ""),
    ciudad: (e.ciudad || "").trim(),
    estado: (e.estado || "").trim(),
    referencias: (e.referencias || "").trim(),
  };

  // Para COTIZAR el envío basta el C.P.: la paquetería cobra por zona, no por
  // calle. Lo demás (calle, número, correo) lo puede llenar la clienta en el
  // link antes de pagar, así no tiene que dar su domicilio por WhatsApp.
  const faltan: string[] = [];
  if (envio.cp.length !== 5) faltan.push("C.P. (5 dígitos)");
  if (!envio.estado || !envio.ciudad) {
    faltan.push("estado y ciudad (se llenan solos al escribir el C.P.)");
  }
  if (envio.telefono && envio.telefono.length !== 10) {
    faltan.push("WhatsApp de 10 dígitos (o déjalo vacío)");
  }
  if (envio.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(envio.email)) {
    faltan.push("correo bien escrito (o déjalo vacío)");
  }
  if (faltan.length) {
    return json({ error: "Faltan datos: " + faltan.join(", ") }, 400);
  }

  // ---- Cotizar el envío REAL con Skydropx ----
  let costo = 0;
  let paqueteria = "";
  let servicio = "";
  let servicioCode = "";
  let dias: number | null = null;

  const items = [
    { tipo: "lote" as const, id: "lote:" + lote.id, qty, piezas: lote.piezas },
  ];

  // Caja: si la dueña eligió/midió una, esa manda. Si no, la típica del lote.
  const lim = (v: unknown, min: number, max: number) =>
    Math.min(max, Math.max(min, Number(v) || 0));
  let paqueteUsado: Paquete | null = null;
  let parcels: Paquete[];
  if (body.paquete && Number(body.paquete.weight) > 0) {
    paqueteUsado = {
      length: lim(body.paquete.length, 1, 150),
      width: lim(body.paquete.width, 1, 150),
      height: lim(body.paquete.height, 1, 150),
      weight: lim(body.paquete.weight, 0.1, 70),
    };
    const nCajas = Math.min(20, Math.max(1, Math.floor(Number(body.cajas) || qty)));
    parcels = Array.from({ length: nCajas }, () => paqueteUsado as Paquete);
  } else {
    parcels = parcelsDeItems(items);
  }

  try {
    if (!parcels.length) throw new Error("sin_caja");
    const todas = await cotizarEnvioReal(
      { cp: envio.cp, estado: envio.estado, ciudad: envio.ciudad, colonia: envio.colonia },
      parcels
    );
    const rates = filtrarPaqueterias(todas);
    if (rates.length) {
      const elegida =
        rates.find((r) => r.servicioCode === body.servicioCode) || rates[0];
      costo = precioEnvioAlCliente(elegida.total);
      paqueteria = elegida.proveedor;
      servicio = elegida.servicio;
      servicioCode = elegida.servicioCode;
      dias = elegida.dias;
    }
  } catch {
    // Si Skydropx falla, la cotización se crea sin envío y se avisa.
  }

  const subtotal = lote.precio * qty;
  const total = subtotal + costo;

  const sb = createAdminSupabase();

  const campos = {
    lote_id: lote.id,
    qty,
    cliente_nombre: (body.clienteNombre || envio.nombre).trim().slice(0, 60),
    // Guardamos la caja usada: al generar la guía se reutiliza la misma medida
    // con la que se cotizó, para que el costo no cambie.
    envio: paqueteUsado ? { ...envio, paquete: paqueteUsado } : envio,
    envio_costo: costo,
    envio_paqueteria: paqueteria,
    envio_servicio: servicio,
    envio_servicio_code: servicioCode,
    envio_dias: dias,
    subtotal,
    total,
  };

  // ---- EDITAR una cotización que ya existe (mismo link) ----
  const idEditar = (body.id || "").trim().toUpperCase();
  if (idEditar) {
    const { data: previa } = await sb
      .from("cotizaciones")
      .select("id,pagada")
      .eq("id", idEditar)
      .maybeSingle();
    if (!previa) return json({ error: "Esa cotización ya no existe." }, 404);
    if (previa.pagada) {
      return json(
        { error: "Esa cotización ya fue pagada: haz una nueva." },
        409
      );
    }
    const { error: errUp } = await sb
      .from("cotizaciones")
      .update({ ...campos, editada_en: Date.now(), creada_por: user.email || "" })
      .eq("id", idEditar);
    if (errUp) {
      return json({ error: "No se pudo actualizar: " + errUp.message }, 500);
    }
    return json({
      ok: true,
      id: idEditar,
      editada: true,
      falta_cliente: faltanDelCliente(envio),
      lote: lote.nombre,
      piezas: lote.piezas * qty,
      subtotal,
      envio_costo: costo,
      envio_paqueteria: paqueteria,
      envio_dias: dias,
      total,
      sin_envio: costo === 0,
    });
  }

  // ---- CREAR una nueva: código único (reintenta si choca) ----
  let id = codigoCorto();
  for (let i = 0; i < 5; i++) {
    const { data } = await sb.from("cotizaciones").select("id").eq("id", id).maybeSingle();
    if (!data) break;
    id = codigoCorto();
  }

  const { error } = await sb.from("cotizaciones").insert({
    id,
    ...campos,
    creada_en: Date.now(),
    creada_por: user.email || "",
  });
  if (error) {
    return json({ error: "No se pudo guardar la cotización: " + error.message }, 500);
  }

  return json({
    ok: true,
    id,
    falta_cliente: faltanDelCliente(envio),
    lote: lote.nombre,
    piezas: lote.piezas * qty,
    subtotal,
    envio_costo: costo,
    envio_paqueteria: paqueteria,
    envio_dias: dias,
    total,
    sin_envio: costo === 0,
  });
}
