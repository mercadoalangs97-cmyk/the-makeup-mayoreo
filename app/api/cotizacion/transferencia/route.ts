import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createAdminSupabase, createServerSupabase } from "../../../lib/supabase";
import { itemsDeCotizacion, resolverItems } from "../../../lib/cotItems";
import { enviarCorreosVenta, type OrdenCorreo } from "../../../lib/email";
import { LOTES } from "../../../lib/lotes";

// La clienta pagó por TRANSFERENCIA (fuera de Mercado Pago). Aquí se registra
// ese pago a mano desde el panel y de ahí en adelante todo sigue el MISMO
// camino que una venta normal: se crea o salda la orden, se llama al mismo
// procesador de pagos y salen los mismos correos. La única diferencia real es
// que no hay comisión que descontar: el neto es el total.
//
// Protegido con sesión del panel: marcar pagos es dinero.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function usuarioValido(token: string | undefined) {
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

const txt = (v: unknown, alt = "") => String(v ?? alt ?? "").trim();

export async function POST(req: Request) {
  let body: {
    id?: string;
    token?: string;
    referencia?: string;
    datos?: Record<string, string>;
    // Venta que ya se atendio por fuera: la guia YA existe y ya se le mando.
    guia?: { tracking?: string; url?: string; paqueteria?: string };
    sinCorreo?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!(await usuarioValido(body.token))) {
    return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
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
  if (cot.pagada) {
    return NextResponse.json(
      { error: "Esa cotización ya está marcada como pagada." },
      { status: 409 }
    );
  }

  // Precios SIEMPRE del servidor, igual que en el pago normal.
  const resuelto = await resolverItems(itemsDeCotizacion(cot));
  if (resuelto.error) {
    return NextResponse.json({ error: resuelto.error }, { status: 409 });
  }
  const subtotal = resuelto.subtotal;
  const descuento = Math.min(
    Math.max(0, Math.round(Number(cot.descuento) || 0)),
    subtotal - 1
  );
  const subtotalConDescuento = subtotal - descuento;
  const envioCosto = Math.max(0, Math.round(Number(cot.envio_costo) || 0));

  // Datos de envío: lo guardado en la cotización, completado con lo que la
  // dueña capture en el panel (normalmente los pidió por WhatsApp).
  const g = (cot.envio || {}) as Record<string, string>;
  const d = body.datos || {};
  const env = {
    nombre: txt(d.nombre, g.nombre) || txt(cot.cliente_nombre),
    telefono: txt(d.telefono, g.telefono).replace(/\D/g, "").slice(0, 10),
    email: txt(d.email, g.email),
    calle: txt(d.calle, g.calle),
    numero: txt(d.numero, g.numero),
    colonia: txt(d.colonia, g.colonia),
    referencias: txt(d.referencias, g.referencias),
    cp: txt(g.cp),
    ciudad: txt(g.ciudad),
    estado: txt(g.estado),
  };

  const faltan: string[] = [];
  if (env.nombre.length < 3) faltan.push("nombre");
  if (env.telefono.length !== 10) faltan.push("telefono");
  if (!env.calle) faltan.push("calle");
  if (!env.numero) faltan.push("numero");
  if (!env.colonia) faltan.push("colonia");
  if (faltan.length) {
    return NextResponse.json(
      { error: "Faltan datos de envío.", faltan },
      { status: 400 }
    );
  }

  const itemsOrden = resuelto.items.map((i, idx) => ({
    tipo: i.tipo === "producto" ? ("producto" as const) : ("lote" as const),
    ref: i.ref,
    nombre: i.nombre.slice(0, 250),
    precio: i.precio,
    qty: i.qty,
    piezas: i.piezas,
    ...(idx === 0 && descuento > 0 ? { descuento } : {}),
  }));

  const envioOrden = {
    ...env,
    modo: "cotizar",
    costo_cobrado: envioCosto,
    paqueteria: cot.envio_paqueteria || "",
    servicio: cot.envio_servicio || "",
    servicio_code: cot.envio_servicio_code || "",
    dias: cot.envio_dias ?? null,
    cotizacion: id,
    metodo_pago: "transferencia",
    referencia_pago: txt(body.referencia).slice(0, 60) || null,
  };

  // Si la clienta ya le había dado a "Pagar", esa orden existe sin saldar:
  // se reusa en vez de crear una duplicada.
  const { data: previas } = await sb
    .from("ordenes_web")
    .select("id,total,inventario_descontado,envio,creado_en")
    .eq("inventario_descontado", false)
    .order("creado_en", { ascending: false })
    .limit(60);
  const reusable = (previas || []).find(
    (o) =>
      (o.envio as Record<string, unknown> | null)?.cotizacion === id &&
      Number(o.total) === subtotalConDescuento
  );

  let ordenId: string;
  if (reusable) {
    ordenId = reusable.id as string;
    const { error: upErr } = await sb
      .from("ordenes_web")
      .update({
        items: itemsOrden,
        total: subtotalConDescuento,
        envio: envioOrden,
        cliente: env.nombre,
        email: env.email || null,
        wpp: env.telefono || null,
      })
      .eq("id", ordenId);
    if (upErr) {
      return NextResponse.json(
        { error: "No se pudo actualizar la orden: " + upErr.message },
        { status: 500 }
      );
    }
  } else {
    ordenId = randomUUID();
    const { error: insErr } = await sb.from("ordenes_web").insert({
      id: ordenId,
      items: itemsOrden,
      total: subtotalConDescuento,
      status: "pending",
      canal: "web",
      inventario_descontado: false,
      creado_en: Date.now(),
      envio: envioOrden,
      cliente: env.nombre,
      email: env.email || null,
      wpp: env.telefono || null,
    });
    if (insErr) {
      return NextResponse.json(
        { error: "No se pudo crear la orden: " + insErr.message },
        { status: 500 }
      );
    }
  }

  // MISMA llamada que hace el webhook con un pago aprobado. La transferencia
  // no cobra comisión: el neto es el total, a diferencia de Mercado Pago.
  const totalCobrado = subtotalConDescuento + envioCosto;
  const { data: resultado, error } = await sb.rpc("procesar_pago_web", {
    p_orden_id: ordenId,
    p_payment_id: "TRANSFER-" + (txt(body.referencia).slice(0, 40) || Date.now()),
    p_mp_status: "approved",
    p_comision: 0,
    p_neto: totalCobrado,
  });
  if (error) {
    return NextResponse.json(
      { error: "No se pudo registrar el pago: " + error.message },
      { status: 500 }
    );
  }

  await sb.from("cotizaciones").update({ pagada: true }).eq("id", id);

  // Si la guia YA se habia generado y enviado por fuera, se engancha aqui:
  // asi el pedido nace como enviado y el panel no ofrece generar otra (que
  // se cobraria de nuevo). Va DESPUES del RPC para que nada lo sobreescriba.
  const gTracking = txt(body.guia?.tracking).slice(0, 60);
  const gUrl = txt(body.guia?.url).slice(0, 500);
  const yaEnviada = Boolean(gTracking || gUrl);
  if (yaEnviada) {
    const ahora = Date.now();
    await sb
      .from("ordenes_web")
      .update({
        guia_tracking: gTracking || null,
        guia_url: gUrl || null,
        preparado: true,
        preparado_en: ahora,
        enviado: true,
        enviado_en: ahora,
        envio: {
          ...envioOrden,
          guia_paqueteria: txt(body.guia?.paqueteria) || envioOrden.paqueteria || null,
          guia_registrada_a_mano: true,
        },
      })
      .eq("id", ordenId);
  }

  // Correos idénticos a los de una venta normal. Best-effort: si el correo
  // falla, el pago ya quedó registrado y no se pierde.
  let correo = false;
  if (resultado === "ok" && !body.sinCorreo) {
    try {
      const { data: orden } = await sb
        .from("ordenes_web")
        .select("id,items,total,envio,cliente,email,mp_fee,mp_neto")
        .eq("id", ordenId)
        .single();
      if (orden) {
        const items = (orden.items || []) as Array<{
          tipo: string;
          ref: string;
          foto?: string | null;
        }>;
        const skus = items.filter((i) => i.tipo === "producto").map((i) => i.ref);
        const fotos = new Map<string, string | null>();
        if (skus.length > 0) {
          const { data: prods } = await sb
            .from("productos")
            .select("sku,foto")
            .in("sku", skus);
          (prods || []).forEach((p) => fotos.set(p.sku, p.foto));
        }
        for (const it of items) {
          it.foto =
            it.tipo === "lote"
              ? LOTES.find((l) => l.id === it.ref)?.foto ?? null
              : fotos.get(it.ref) ?? null;
        }
        await enviarCorreosVenta(orden as OrdenCorreo);
        correo = Boolean(orden.email);
      }
    } catch (e) {
      console.error("[transferencia] correos:", e);
    }
  }

  return NextResponse.json({
    ok: true,
    orden_id: ordenId,
    resultado,
    total: totalCobrado,
    correo,
    reusada: Boolean(reusable),
    yaEnviada,
  });
}
