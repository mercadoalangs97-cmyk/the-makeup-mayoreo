import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { Preference } from "mercadopago";
import { createAdminSupabase } from "../../lib/supabase";
import { mpClient, mpConfigurado } from "../../lib/mercadopago";
import {
  LOTES,
  calcularEnvio,
  modoEnvio,
  parcelsDeItems,
} from "../../lib/lotes";
import { cotizarEnvioReal, filtrarPaqueterias } from "../../lib/skydropx";
import { SITE_URL } from "../../lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Item tal como llega del carrito en el cliente
type ItemEntrada = { id: string; qty: number };

// Item normalizado y validado en el servidor (lo que guardamos / cobramos)
type ItemOrden = {
  tipo: "producto" | "lote";
  ref: string; // sku (producto) o id de lote
  nombre: string;
  precio: number; // precio unitario validado en servidor
  qty: number;
  piezas?: number; // solo lotes: piezas por unidad de lote
};

export async function POST(req: Request) {
  if (!mpConfigurado()) {
    return NextResponse.json(
      { error: "Mercado Pago no está configurado en el servidor." },
      { status: 500 }
    );
  }

  let body: {
    items?: ItemEntrada[];
    envio?: Record<string, string>;
    envioServicio?: string; // servicioCode elegido (modo cotizar/lotes)
    cupon?: string; // código de descuento (opcional)
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const entradas = (body.items || []).filter(
    (i) => i && typeof i.id === "string" && Number(i.qty) > 0
  );
  if (entradas.length === 0) {
    return NextResponse.json({ error: "Carrito vacío" }, { status: 400 });
  }

  // ---- Validar datos de envío (server-side) ----
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
  const faltan: string[] = [];
  if (envio.nombre.length < 3) faltan.push("nombre");
  if (envio.telefono.length !== 10) faltan.push("WhatsApp (10 dígitos)");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(envio.email)) faltan.push("correo");
  if (!envio.calle) faltan.push("calle");
  if (!envio.numero) faltan.push("número");
  if (!envio.colonia) faltan.push("colonia");
  if (envio.cp.length !== 5) faltan.push("C.P. (5 dígitos)");
  if (!envio.ciudad) faltan.push("ciudad");
  if (!envio.estado) faltan.push("estado");
  if (faltan.length > 0) {
    return NextResponse.json(
      { error: "Faltan o son inválidos: " + faltan.join(", ") },
      { status: 400 }
    );
  }

  const supabase = createAdminSupabase();

  // Separar productos individuales y lotes
  const skus = entradas
    .filter((i) => i.id.startsWith("prod:"))
    .map((i) => i.id.slice(5));
  const loteEntradas = entradas.filter((i) => i.id.startsWith("lote:"));

  const itemsOrden: ItemOrden[] = [];

  // ---- Validar productos individuales (stock por SKU, precio del servidor) ----
  if (skus.length > 0) {
    const { data: prods, error } = await supabase
      .from("productos")
      .select("sku,nombre,nombre_seo,precio_mxn,stock")
      .in("sku", skus);
    if (error) {
      return NextResponse.json(
        { error: "Error leyendo productos: " + error.message },
        { status: 500 }
      );
    }
    const porSku = new Map((prods || []).map((p) => [p.sku, p]));
    for (const e of entradas.filter((i) => i.id.startsWith("prod:"))) {
      const sku = e.id.slice(5);
      const p = porSku.get(sku);
      const qty = Math.floor(Number(e.qty));
      if (!p) {
        return NextResponse.json(
          { error: `Producto no disponible: ${sku}` },
          { status: 409 }
        );
      }
      if ((p.stock ?? 0) < qty) {
        return NextResponse.json(
          {
            error: `Sin stock suficiente de "${p.nombre_seo || p.nombre}" (quedan ${p.stock}).`,
            sku,
          },
          { status: 409 }
        );
      }
      itemsOrden.push({
        tipo: "producto",
        ref: sku,
        nombre: (p.nombre_seo || p.nombre || sku).slice(0, 250),
        precio: Number(p.precio_mxn ?? 0),
        qty,
      });
    }
  }

  // ---- Validar lotes (stock TOTAL de productos alcanza las piezas) ----
  if (loteEntradas.length > 0) {
    let piezasRequeridas = 0;
    for (const e of loteEntradas) {
      const loteId = e.id.slice(5);
      const lote = LOTES.find((l) => l.id === loteId);
      const qty = Math.floor(Number(e.qty));
      if (!lote) {
        return NextResponse.json(
          { error: `Lote no disponible: ${loteId}` },
          { status: 409 }
        );
      }
      if (lote.wppOnly) {
        return NextResponse.json(
          { error: `El lote "${lote.nombre}" solo se vende por WhatsApp.` },
          { status: 409 }
        );
      }
      piezasRequeridas += lote.piezas * qty;
      itemsOrden.push({
        tipo: "lote",
        ref: lote.id,
        nombre: lote.nombre.slice(0, 250),
        precio: lote.precio,
        qty,
        piezas: lote.piezas,
      });
    }
    // Suma del stock total disponible
    const { data: stockRows, error: stErr } = await supabase
      .from("productos")
      .select("stock")
      .gt("stock", 0);
    if (stErr) {
      return NextResponse.json(
        { error: "Error validando stock de lotes: " + stErr.message },
        { status: 500 }
      );
    }
    const stockTotal = (stockRows || []).reduce(
      (s, r) => s + (r.stock ?? 0),
      0
    );
    if (stockTotal < piezasRequeridas) {
      return NextResponse.json(
        {
          error: `No hay piezas suficientes para los lotes (se requieren ${piezasRequeridas}, hay ${stockTotal}).`,
        },
        { status: 409 }
      );
    }
  }

  // ---- Cupón de descuento (aplica solo a productos individuales / AMAREA) ----
  let cupon: string | null = null;
  let descuento = 0;
  const codigoCupon = (body.cupon || "").trim().toUpperCase();
  if (codigoCupon) {
    const { data: c } = await supabase
      .from("cupones")
      .select("*")
      .eq("codigo", codigoCupon)
      .eq("activo", true)
      .maybeSingle();
    if (!c) {
      return NextResponse.json(
        { error: `El código "${codigoCupon}" no es válido o ya expiró.` },
        { status: 409 }
      );
    }
    const productItems = itemsOrden.filter((it) => it.tipo === "producto");
    const baseProductos = productItems.reduce(
      (s, it) => s + it.precio * it.qty,
      0
    );
    if (c.solo_productos && baseProductos <= 0) {
      return NextResponse.json(
        { error: "Este código solo aplica a productos individuales (no a lotes)." },
        { status: 409 }
      );
    }
    if (c.min_compra && baseProductos < Number(c.min_compra)) {
      return NextResponse.json(
        { error: `El código aplica en compras de productos desde ${c.min_compra}.` },
        { status: 409 }
      );
    }
    // Una vez por WhatsApp: ¿ya hay una compra PAGADA con este código y número?
    if (c.una_vez_por_wpp) {
      const { data: previa } = await supabase
        .from("ordenes_web")
        .select("id")
        .eq("wpp", envio.telefono)
        .eq("cupon", codigoCupon)
        .eq("status", "pagado")
        .limit(1);
      if (previa && previa.length > 0) {
        return NextResponse.json(
          { error: "Este código de bienvenida ya se usó con este número de WhatsApp." },
          { status: 409 }
        );
      }
    }
    // Aplica el porcentaje bajando el precio de cada producto (MP no acepta
    // importes negativos; así el descuento queda repartido y transparente).
    const factor = 1 - Number(c.valor) / 100;
    for (const it of productItems) {
      const nuevo = Math.round(it.precio * factor * 100) / 100;
      descuento += (it.precio - nuevo) * it.qty;
      it.precio = nuevo;
    }
    descuento = Math.round(descuento * 100) / 100;
    cupon = codigoCupon;
  }

  const total = itemsOrden.reduce((s, it) => s + it.precio * it.qty, 0);

  // ---- Envío que paga el cliente ----
  // NOTA: `total` se queda como subtotal de PRODUCTOS (la nota/contabilidad lo
  // usa así). El envío va como línea aparte en MP y guardado en `envio`.
  const itemsParaModo = itemsOrden.map((it) => ({
    tipo: it.tipo,
    id: it.tipo === "lote" ? "lote:" + it.ref : "prod:" + it.ref,
    qty: it.qty,
    piezas: it.piezas,
  }));
  const modo = modoEnvio(itemsParaModo);

  let envioMonto = 0;
  const envioExtra: Record<string, unknown> = { modo };

  if (modo === "amarea") {
    // Regla fija: gratis desde $599, si no $129
    envioMonto = calcularEnvio(itemsOrden) ?? 0;
  } else if (modo === "cotizar") {
    // LOTES: re-cotizamos en el servidor y validamos el servicio elegido
    if (!body.envioServicio) {
      return NextResponse.json(
        { error: "Elige una opción de envío antes de pagar." },
        { status: 400 }
      );
    }
    let rates;
    try {
      const todas = await cotizarEnvioReal(
        { cp: envio.cp, estado: envio.estado, ciudad: envio.ciudad, colonia: envio.colonia },
        parcelsDeItems(itemsParaModo)
      );
      rates = filtrarPaqueterias(todas); // mismas paqueterías que vio el cliente
    } catch {
      return NextResponse.json(
        { error: "No se pudo confirmar el envío. Vuelve a cotizar." },
        { status: 502 }
      );
    }
    const elegida = rates.find((r) => r.servicioCode === body.envioServicio);
    if (!elegida) {
      return NextResponse.json(
        { error: "La opción de envío ya no está disponible. Vuelve a cotizar." },
        { status: 409 }
      );
    }
    envioMonto = Math.round(elegida.total);
    envioExtra.paqueteria = elegida.proveedor;
    envioExtra.servicio = elegida.servicio;
    envioExtra.servicio_code = elegida.servicioCode;
    envioExtra.dias = elegida.dias;
  }
  // modo === "coordinar" → envioMonto 0 (se acuerda por WhatsApp)

  const envioConDatos = { ...envio, ...envioExtra, costo_cobrado: envioMonto };

  const ordenId = randomUUID();
  const ahora = Date.now();

  // ---- Crear orden PENDIENTE (fuente de verdad para el webhook) ----
  const ordenRow: Record<string, unknown> = {
    id: ordenId,
    items: itemsOrden,
    total,
    status: "pending",
    canal: "web",
    inventario_descontado: false,
    creado_en: ahora,
    envio: envioConDatos,
    cliente: envio.nombre,
    email: envio.email,
    wpp: envio.telefono,
  };
  // Solo tocamos las columnas de cupón cuando se usó uno (así el checkout
  // sigue funcionando aunque la migración de cupón aún no se haya corrido).
  if (cupon) {
    ordenRow.cupon = cupon;
    ordenRow.descuento = descuento;
  }
  const { error: insErr } = await supabase.from("ordenes_web").insert(ordenRow);
  if (insErr) {
    return NextResponse.json(
      { error: "No se pudo crear la orden: " + insErr.message },
      { status: 500 }
    );
  }

  // ---- Crear preferencia de Mercado Pago ----
  try {
    const mpItems = itemsOrden.map((it) => ({
      id: it.ref,
      title: it.nombre,
      quantity: it.qty,
      unit_price: it.precio,
      currency_id: "MXN",
    }));
    // Cobrar el envío como una línea más (solo AMAREA con tarifa > 0)
    if (envioMonto > 0) {
      mpItems.push({
        id: "envio",
        title: "Envío",
        quantity: 1,
        unit_price: envioMonto,
        currency_id: "MXN",
      });
    }

    const pref = new Preference(mpClient());
    const result = await pref.create({
      body: {
        items: mpItems,
        external_reference: ordenId,
        metadata: { orden_id: ordenId },
        payer: {
          name: envio.nombre,
          email: envio.email,
          phone: { area_code: "", number: envio.telefono },
        },
        back_urls: {
          success: `${SITE_URL}/checkout/exito`,
          pending: `${SITE_URL}/checkout/pendiente`,
          failure: `${SITE_URL}/checkout/error`,
        },
        auto_return: "approved",
        notification_url: `${SITE_URL}/api/mercadopago/webhook`,
        statement_descriptor: "THEMAKEUP",
      },
    });

    await supabase
      .from("ordenes_web")
      .update({ mp_preference_id: result.id })
      .eq("id", ordenId);

    const initPoint = result.init_point || result.sandbox_init_point;
    if (!initPoint) {
      return NextResponse.json(
        { error: "Mercado Pago no devolvió init_point." },
        { status: 502 }
      );
    }
    return NextResponse.json({ init_point: initPoint, orden_id: ordenId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await supabase
      .from("ordenes_web")
      .update({ status: "error_preferencia" })
      .eq("id", ordenId);
    return NextResponse.json(
      { error: "Error creando preferencia: " + msg },
      { status: 502 }
    );
  }
}
