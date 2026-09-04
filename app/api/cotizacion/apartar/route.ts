import { NextResponse } from "next/server";
import { Preference } from "mercadopago";
import { createAdminSupabase } from "../../../lib/supabase";
import { mpClient, mpConfigurado } from "../../../lib/mercadopago";
import { itemsDeCotizacion, resolverItems } from "../../../lib/cotItems";
import { SITE_URL } from "../../../lib/site";

// APARTADO: la clienta paga un anticipo para reservar su lote y completa el
// resto despues. El anticipo NO es una venta — no crea orden ni descuenta
// inventario; solo aparta. La venta se registra cuando paga la diferencia.
//
// El external_reference lleva el prefijo APART- para que el webhook sepa que
// ese pago es un anticipo y no lo procese como una orden normal.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Sin export: un archivo de ruta de Next solo puede exportar sus handlers.
/** Porcentaje del total que se pide para apartar. */
const PCT_APARTADO = 0.05;
/** Piso: por debajo de esto la comision de Mercado Pago se come el anticipo. */
const APARTADO_MINIMO = 100;

function montoApartado(total: number): number {
  return Math.max(APARTADO_MINIMO, Math.ceil(total * PCT_APARTADO));
}

export async function POST(req: Request) {
  if (!mpConfigurado()) {
    return NextResponse.json(
      { error: "Mercado Pago no está configurado." },
      { status: 500 }
    );
  }

  let body: { id?: string };
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
  if (cot.pagada) {
    return NextResponse.json({ error: "Esta cotización ya está pagada." }, { status: 409 });
  }
  if (Number(cot.apartado_monto) > 0) {
    return NextResponse.json(
      { error: "Este lote ya está apartado. Abre tu link para pagar la diferencia." },
      { status: 409 }
    );
  }

  // Precios SIEMPRE del servidor.
  const resuelto = await resolverItems(itemsDeCotizacion(cot));
  if (resuelto.error) {
    return NextResponse.json({ error: resuelto.error }, { status: 409 });
  }
  const descuento = Math.min(
    Math.max(0, Math.round(Number(cot.descuento) || 0)),
    resuelto.subtotal - 1
  );
  const envioCosto = Math.max(0, Math.round(Number(cot.envio_costo) || 0));
  const total = resuelto.subtotal - descuento + envioCosto;
  const anticipo = montoApartado(total);

  try {
    const pref = new Preference(mpClient());
    const env = (cot.envio || {}) as Record<string, string>;
    const result = await pref.create({
      body: {
        items: [
          {
            id: "apartado-" + id,
            title: `Apartado de tu lote · ${id}`,
            description: `Anticipo. Saldo restante: $${(total - anticipo).toLocaleString("es-MX")}`,
            quantity: 1,
            unit_price: anticipo,
            currency_id: "MXN",
          },
        ],
        // El prefijo le dice al webhook que esto es un ANTICIPO, no una venta.
        external_reference: "APART-" + id,
        metadata: { cotizacion: id, tipo: "apartado", anticipo, total },
        payer: {
          name: env.nombre || cot.cliente_nombre || "",
          ...(env.email ? { email: env.email } : {}),
          ...(String(env.telefono || "").length === 10
            ? {
                phone: {
                  area_code: String(env.telefono).slice(0, 2),
                  number: String(env.telefono).slice(2),
                },
              }
            : {}),
        },
        back_urls: {
          success: `${SITE_URL}/cotizacion/${id}`,
          pending: `${SITE_URL}/cotizacion/${id}`,
          failure: `${SITE_URL}/cotizacion/${id}`,
        },
        auto_return: "approved",
        notification_url: `${SITE_URL}/api/mercadopago/webhook`,
        statement_descriptor: "THEMAKEUP",
      },
    });

    const initPoint = result.init_point || result.sandbox_init_point;
    if (!initPoint) {
      return NextResponse.json(
        { error: "No se pudo abrir el pago del apartado." },
        { status: 500 }
      );
    }
    return NextResponse.json({ init_point: initPoint, anticipo, total });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "No se pudo generar el apartado: " + msg },
      { status: 500 }
    );
  }
}
