import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { Preference } from "mercadopago";
import { createAdminSupabase } from "../../../lib/supabase";
import { mpClient, mpConfigurado } from "../../../lib/mercadopago";
import { LOTES } from "../../../lib/lotes";
import { SITE_URL } from "../../../lib/site";

// La clienta abre su cotización y le da "Pagar": creamos la orden con los datos
// que YA capturamos (no tiene que llenar nada) y la mandamos a Mercado Pago.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!mpConfigurado()) {
    return NextResponse.json(
      { error: "Mercado Pago no está configurado." },
      { status: 500 }
    );
  }

  let body: { id?: string; datos?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const id = (body.id || "").trim().toUpperCase();
  if (!id) return NextResponse.json({ error: "Falta la cotización" }, { status: 400 });

  const sb = createAdminSupabase();
  const { data: cot } = await sb
    .from("cotizaciones")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!cot) {
    return NextResponse.json({ error: "Cotización no encontrada." }, { status: 404 });
  }

  const lote = LOTES.find((l) => l.id === cot.lote_id);
  if (!lote) {
    return NextResponse.json({ error: "El lote ya no está disponible." }, { status: 409 });
  }

  // Los precios SIEMPRE se recalculan del servidor (nunca se confía en el cliente).
  const qty = Math.max(1, Number(cot.qty) || 1);
  const subtotal = lote.precio * qty;
  // El descuento se toma de lo GUARDADO, nunca de lo que mande el navegador.
  const descuento = Math.min(
    Math.max(0, Math.round(Number(cot.descuento) || 0)),
    subtotal - 1
  );
  const subtotalConDescuento = subtotal - descuento;
  const envioCosto = Math.max(0, Math.round(Number(cot.envio_costo) || 0));
  const piezasRequeridas = lote.piezas * qty;

  // Validar que haya piezas suficientes en inventario.
  const { data: stockRows } = await sb.from("productos").select("stock").gt("stock", 0);
  const stockTotal = (stockRows || []).reduce((s, r) => s + (r.stock ?? 0), 0);
  if (stockTotal < piezasRequeridas) {
    return NextResponse.json(
      { error: "En este momento no tenemos piezas suficientes. Escríbenos por WhatsApp." },
      { status: 409 }
    );
  }

  // La cotización pudo crearse SOLO con el C.P. (para no pedirle el domicilio
  // por WhatsApp). Lo que falte lo completa la clienta aquí, y se valida antes
  // de cobrar: sin dirección completa no se puede generar la guía.
  const guardado = (cot.envio || {}) as Record<string, string>;
  const d = body.datos || {};
  const txt = (a: unknown, b: unknown) => String(a ?? b ?? "").trim();
  const env: Record<string, string> = {
    ...guardado,
    nombre: txt(d.nombre, guardado.nombre),
    telefono: txt(d.telefono, guardado.telefono).replace(/\D/g, ""),
    email: txt(d.email, guardado.email),
    calle: txt(d.calle, guardado.calle),
    numero: txt(d.numero, guardado.numero),
    colonia: txt(d.colonia, guardado.colonia),
    referencias: txt(d.referencias, guardado.referencias),
  };

  const faltan: string[] = [];
  if (env.nombre.length < 3) faltan.push("tu nombre completo");
  if (env.telefono.length !== 10) faltan.push("tu teléfono a 10 dígitos");
  if (!env.calle) faltan.push("tu calle");
  if (!env.numero) faltan.push("el número");
  if (!env.colonia) faltan.push("tu colonia");
  if (env.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.email)) {
    faltan.push("un correo bien escrito");
  }
  if (faltan.length) {
    return NextResponse.json(
      { error: "Nos falta " + faltan.join(", ") + ".", faltan },
      { status: 400 }
    );
  }

  const itemsOrden = [
    {
      tipo: "lote" as const,
      ref: lote.id,
      nombre: lote.nombre.slice(0, 250),
      precio: lote.precio,
      qty,
      piezas: lote.piezas,
      descuento,
    },
  ];

  const ordenId = randomUUID();
  const ahora = Date.now();

  const { error: insErr } = await sb.from("ordenes_web").insert({
    id: ordenId,
    items: itemsOrden,
    total: subtotalConDescuento,
    status: "pending",
    canal: "web",
    inventario_descontado: false,
    creado_en: ahora,
    envio: {
      ...env,
      modo: "cotizar",
      costo_cobrado: envioCosto,
      paqueteria: cot.envio_paqueteria || "",
      servicio: cot.envio_servicio || "",
      servicio_code: cot.envio_servicio_code || "",
      dias: cot.envio_dias ?? null,
      cotizacion: id,
    },
    cliente: env.nombre || cot.cliente_nombre || "Cliente",
    email: env.email || null,
    wpp: env.telefono || null,
  });
  if (insErr) {
    return NextResponse.json(
      { error: "No se pudo crear la orden: " + insErr.message },
      { status: 500 }
    );
  }

  try {
    // Mercado Pago no admite renglones en negativo, así que el descuento va
    // aplicado en el precio: un solo renglón con el neto exacto.
    const tituloLote =
      (qty > 1 ? `${lote.nombre} × ${qty}` : lote.nombre) +
      (descuento > 0 ? " (precio especial)" : "");
    const mpItems = [
      {
        id: lote.id,
        title: tituloLote.slice(0, 250),
        quantity: 1,
        unit_price: subtotalConDescuento,
        currency_id: "MXN",
      },
    ];
    if (envioCosto > 0) {
      mpItems.push({
        id: "envio",
        title: "Envío",
        quantity: 1,
        unit_price: envioCosto,
        currency_id: "MXN",
      });
    }

    const pref = new Preference(mpClient());
    const result = await pref.create({
      body: {
        items: mpItems,
        external_reference: ordenId,
        metadata: { orden_id: ordenId, cotizacion: id },
        // El correo es opcional: si no lo tenemos, NO mandamos la llave vacía
        // (Mercado Pago la rechaza) y él lo captura al pagar.
        payer: {
          name: env.nombre || "",
          ...(env.email ? { email: env.email } : {}),
          phone: { area_code: "", number: env.telefono || "" },
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

    await sb
      .from("ordenes_web")
      .update({ mp_preference_id: result.id })
      .eq("id", ordenId);
    await sb
      .from("cotizaciones")
      .update({
        orden_id: ordenId,
        // vista_en lo marca /api/cotizacion/visto al abrir la página; aquí solo
        // registramos que llegó a darle al botón de pagar.
        pago_click_en: Date.now(),
        // Guardamos la dirección ya completa por la clienta
        envio: env,
        cliente_nombre: env.nombre || cot.cliente_nombre,
      })
      .eq("id", id);

    const initPoint = result.init_point || result.sandbox_init_point;
    if (!initPoint) {
      return NextResponse.json(
        { error: "Mercado Pago no devolvió el enlace de pago." },
        { status: 502 }
      );
    }
    return NextResponse.json({ init_point: initPoint, orden_id: ordenId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await sb.from("ordenes_web").update({ status: "error_preferencia" }).eq("id", ordenId);
    return NextResponse.json({ error: "Error creando el pago: " + msg }, { status: 502 });
  }
}
