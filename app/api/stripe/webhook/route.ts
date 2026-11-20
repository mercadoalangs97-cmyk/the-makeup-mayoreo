import { NextResponse } from "next/server";
import { createAdminSupabase } from "../../../lib/supabase";
import { stripeApi, stripeConfigurado, verificarFirma } from "../../../lib/stripe";
import { procesarPagoAprobado } from "../../../lib/procesarPago";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Webhook de Stripe. Verifica la FIRMA y luego consulta a Stripe el estado
// real (no confía en el cuerpo). Eventos que se usan:
//   checkout.session.completed              tarjeta pagada / OXXO generado
//   checkout.session.async_payment_succeeded OXXO pagado
//   checkout.session.async_payment_failed    OXXO vencido
//   charge.dispute.created                   contracargo abierto
//   charge.refunded                          devolución
// Las columnas mp_status / mp_payment_id de ordenes_web se reusan para no
// tocar el panel ni la función SQL (ahí guardan el estado de Stripe).

type Sesion = {
  id: string;
  client_reference_id?: string | null;
  metadata?: Record<string, string>;
  payment_status?: string;
  amount_total?: number;
  customer_details?: { email?: string | null } | null;
  payment_intent?:
    | string
    | {
        id: string;
        payment_method_types?: string[];
        latest_charge?: {
          payment_method_details?: { type?: string; card?: { funding?: string } };
          balance_transaction?: { fee?: number; net?: number } | null;
        } | null;
      }
    | null;
};

function tipoDePago(s: Sesion): string | null {
  const pi = typeof s.payment_intent === "object" ? s.payment_intent : null;
  const det = pi?.latest_charge?.payment_method_details;
  if (det?.type === "oxxo") return "ticket";
  if (det?.type === "card") {
    const f = det.card?.funding;
    return f === "debit" ? "debit_card" : f === "prepaid" ? "prepaid_card" : "credit_card";
  }
  return det?.type || null;
}

async function aprobar(sesionId: string) {
  const s = await stripeApi<Sesion>("GET", `/checkout/sessions/${sesionId}`, {
    expand: ["payment_intent.latest_charge.balance_transaction"],
  });
  if (s.payment_status !== "paid") return { ok: true, resultado: "no_pagado:" + s.payment_status };
  const ref = s.client_reference_id || s.metadata?.orden_id;
  if (!ref) return { ok: true, resultado: "sin_ref" };
  const pi = typeof s.payment_intent === "object" ? s.payment_intent : null;
  const piId = typeof s.payment_intent === "string" ? s.payment_intent : pi?.id || s.id;
  const monto = (s.amount_total || 0) / 100;
  const bt = pi?.latest_charge?.balance_transaction;
  const comision = bt && typeof bt.fee === "number" ? bt.fee / 100 : 0;
  const neto = bt && typeof bt.net === "number" ? bt.net / 100 : monto - comision;
  return procesarPagoAprobado({
    ref,
    paymentId: piId,
    monto,
    tipoPago: tipoDePago(s),
    comision,
    neto,
    email: s.customer_details?.email || null,
  });
}

export async function POST(req: Request) {
  if (!stripeConfigurado()) return NextResponse.json({ ok: false, reason: "stripe_no_configurado" });
  const cuerpo = await req.text();
  const secreto = process.env.STRIPE_WEBHOOK_SECRET || "";
  if (!verificarFirma(cuerpo, req.headers.get("stripe-signature"), secreto)) {
    return NextResponse.json({ ok: false, reason: "firma_invalida" }, { status: 400 });
  }
  let ev: { type: string; data: { object: Record<string, unknown> } };
  try {
    ev = JSON.parse(cuerpo);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const obj = ev.data?.object || {};
  const sb = createAdminSupabase();

  try {
    switch (ev.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const s = obj as unknown as Sesion;
        if (s.payment_status === "paid") {
          const r = await aprobar(s.id);
          if (!r.ok) return NextResponse.json(r, { status: 500 }); // Stripe reintenta
          return NextResponse.json(r);
        }
        // OXXO: ficha generada, falta que paguen. Queda en "pagos a medias".
        const ref = s.client_reference_id || s.metadata?.orden_id;
        const piId = typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id;
        if (ref && !ref.startsWith("APART-")) {
          await sb
            .from("ordenes_web")
            .update({ mp_status: "pending", mp_payment_id: piId || s.id })
            .eq("id", ref)
            .eq("inventario_descontado", false);
        }
        return NextResponse.json({ ok: true, status: s.payment_status });
      }
      case "checkout.session.async_payment_failed":
      case "checkout.session.expired": {
        const s = obj as unknown as Sesion;
        const ref = s.client_reference_id || s.metadata?.orden_id;
        if (ref && !ref.startsWith("APART-")) {
          await sb
            .from("ordenes_web")
            .update({ mp_status: ev.type.endsWith("failed") ? "rejected" : "expired" })
            .eq("id", ref)
            .eq("inventario_descontado", false);
        }
        return NextResponse.json({ ok: true });
      }
      case "charge.dispute.created":
      case "charge.refunded": {
        // Contracargo o devolución: se marca la orden para que se vea en el
        // panel. El stock NO se toca solo (puede ya haberse enviado).
        const piId = String(obj.payment_intent || "");
        if (piId) {
          const marca = ev.type === "charge.refunded" ? "refunded" : "charged_back";
          await sb.from("ordenes_web").update({ mp_status: marca }).eq("mp_payment_id", piId);
        }
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ ok: true, ignorado: ev.type });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[stripe webhook]", ev.type, msg);
    return NextResponse.json({ ok: false, msg }, { status: 500 });
  }
}
