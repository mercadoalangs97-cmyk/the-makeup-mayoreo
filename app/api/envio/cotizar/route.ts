import { NextResponse } from "next/server";
import { loteDeItemId, parcelDeLote, parcelsDeItems } from "../../../lib/lotes";
import {
  cotizarEnvioReal,
  filtrarPaqueterias,
  skydropxConfigurado,
} from "../../../lib/skydropx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ItemEntrada = { id: string; qty: number };

// Cotiza el envío de un carrito con LOTES (solo cotiza, NO genera guía).
export async function POST(req: Request) {
  if (!skydropxConfigurado()) {
    return NextResponse.json(
      { error: "Envío no disponible por ahora. Escríbenos por WhatsApp." },
      { status: 503 }
    );
  }

  let body: { items?: ItemEntrada[]; destino?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  // ---- Destino (lo escribe el cliente en el checkout) ----
  const d = body.destino || {};
  const destino = {
    cp: (d.cp || "").replace(/\D/g, ""),
    estado: (d.estado || "").trim(),
    ciudad: (d.ciudad || "").trim(),
    colonia: (d.colonia || "").trim(),
  };
  if (destino.cp.length !== 5) {
    return NextResponse.json({ error: "C.P. inválido (5 dígitos)." }, { status: 400 });
  }
  if (!destino.estado || !destino.ciudad || !destino.colonia) {
    return NextResponse.json(
      { error: "Faltan estado, ciudad o colonia para cotizar." },
      { status: 400 }
    );
  }

  // ---- Validar lotes del carrito ----
  const entradas = (body.items || []).filter(
    (i) => i && typeof i.id === "string" && Number(i.qty) > 0
  );
  const itemsLote = entradas
    .filter((i) => i.id.startsWith("lote:"))
    .map((i) => ({ tipo: "lote" as const, id: i.id, qty: Math.floor(Number(i.qty)) }));

  if (itemsLote.length === 0) {
    return NextResponse.json(
      { error: "Este pedido no requiere cotización de envío." },
      { status: 400 }
    );
  }

  // ¿Algún lote no cotizable (500 pz / inexistente)? → coordinar por WhatsApp
  for (const it of itemsLote) {
    const lote = loteDeItemId(it.id);
    if (!lote) {
      return NextResponse.json({ error: `Lote no disponible: ${it.id}` }, { status: 409 });
    }
    if (parcelDeLote(lote.piezas) === null) {
      return NextResponse.json(
        { error: "Este lote se cotiza por WhatsApp.", modo: "coordinar" },
        { status: 409 }
      );
    }
  }

  // Cajas a cotizar (productos sueltos, si los hay, suman una caja default)
  const itemsParaParcels = entradas.map((i) => ({
    tipo: i.id.startsWith("lote:") ? ("lote" as const) : ("producto" as const),
    id: i.id,
    qty: Math.floor(Number(i.qty)),
  }));
  const parcels = parcelsDeItems(itemsParaParcels);

  try {
    const todas = await cotizarEnvioReal(destino, parcels);
    const rates = filtrarPaqueterias(todas); // solo paqueterías confiables
    if (rates.length === 0) {
      return NextResponse.json(
        { error: "No hay paqueterías disponibles para tu C.P. Escríbenos por WhatsApp." },
        { status: 502 }
      );
    }
    // Opciones para el cliente (las cajas suman, mostramos precio total)
    const opciones = rates.map((r) => ({
      proveedor: r.proveedor,
      servicio: r.servicio,
      servicioCode: r.servicioCode,
      total: Math.round(r.total),
      dias: r.dias,
    }));
    return NextResponse.json({ opciones, cajas: parcels.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "No se pudo cotizar el envío: " + msg },
      { status: 502 }
    );
  }
}
