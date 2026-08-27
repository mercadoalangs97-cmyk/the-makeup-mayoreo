import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminSupabase } from "../../../lib/supabase";
import { emailConfigurado, EMAIL_NEGOCIO, EMAIL_AVISOS } from "../../../lib/email";
import { fmx } from "../../../lib/lotes";
import { SITE_URL } from "../../../lib/site";

// La clienta dice "ya transferí". Esto NO da el pedido por pagado: solo levanta
// la mano para que la dueña vaya a revisar su banco y lo confirme desde el
// panel. Es público a propósito (la clienta no tiene sesión), y por eso lo
// único que puede hacer es marcar un aviso — nunca tocar precios ni inventario.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { id?: string; nombre?: string; referencia?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const id = (body.id || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{4,12}$/.test(id)) {
    return NextResponse.json({ error: "Cotización inválida" }, { status: 400 });
  }

  const sb = createAdminSupabase();
  const { data: cot } = await sb
    .from("cotizaciones")
    .select("id,cliente_nombre,total,pagada,envio,transferencia_aviso_en")
    .eq("id", id)
    .maybeSingle();
  if (!cot) {
    return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });
  }
  if (cot.pagada) {
    return NextResponse.json({ ok: true, yaPagada: true });
  }
  // Si ya avisó antes, no se vuelve a notificar (evita correos repetidos si le
  // da al botón varias veces).
  const yaAviso = Boolean(cot.transferencia_aviso_en);

  await sb
    .from("cotizaciones")
    .update({ transferencia_aviso_en: cot.transferencia_aviso_en || Date.now() })
    .eq("id", id);

  if (!yaAviso && emailConfigurado()) {
    try {
      const env = (cot.envio || {}) as Record<string, string>;
      const quien =
        (body.nombre || "").trim() || cot.cliente_nombre || env.nombre || "Una clienta";
      const ref = (body.referencia || "").trim().slice(0, 60);
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: `The Makeup Mayoreo <${EMAIL_NEGOCIO}>`,
        to: EMAIL_AVISOS,
        subject: `💸 ${quien} dice que ya transfirió · ${fmx(Number(cot.total) || 0)} · ${id}`,
        html: `
          <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;padding:24px">
            <h2 style="margin:0 0 4px;font-size:19px;color:#2C2420">Avisó una transferencia</h2>
            <p style="margin:0 0 18px;font-size:14px;color:#6b5d57">
              Revisa que el dinero <b>sí haya llegado</b> a la cuenta antes de darlo por pagado.
            </p>
            <table style="width:100%;border-collapse:collapse;font-size:14px;color:#2C2420">
              <tr><td style="padding:7px 0;color:#6b5d57">Cotización</td><td style="text-align:right"><b>${id}</b></td></tr>
              <tr><td style="padding:7px 0;color:#6b5d57">Clienta</td><td style="text-align:right"><b>${quien}</b></td></tr>
              <tr><td style="padding:7px 0;color:#6b5d57">Monto que debió transferir</td><td style="text-align:right"><b>${fmx(Number(cot.total) || 0)}</b></td></tr>
              ${ref ? `<tr><td style="padding:7px 0;color:#6b5d57">Referencia que puso</td><td style="text-align:right"><b>${ref}</b></td></tr>` : ""}
              ${env.telefono ? `<tr><td style="padding:7px 0;color:#6b5d57">WhatsApp</td><td style="text-align:right"><b>${env.telefono}</b></td></tr>` : ""}
            </table>
            <div style="margin-top:20px;padding:14px;background:#fff7e6;border:1px solid #e0a000;border-radius:10px;font-size:13px;color:#8a6100;line-height:1.55">
              <b>Para completarlo:</b> entra al panel, sección Cotizaciones, busca <b>${id}</b>
              y dale a <b>💵 Me pagó por transferencia</b>. Ahí se crea el pedido y salen los
              correos, igual que una venta normal.
            </div>
            <p style="margin:18px 0 0;font-size:12px;color:#8a7068">
              <a href="${SITE_URL}/cotizacion/${id}" style="color:#9E5550">Ver su cotización</a>
            </p>
          </div>`,
      });
    } catch (e) {
      console.error("[transferencia-aviso] correo:", e);
      // El aviso ya quedó guardado en la cotización; el correo es un extra.
    }
  }

  return NextResponse.json({ ok: true, yaAviso });
}
