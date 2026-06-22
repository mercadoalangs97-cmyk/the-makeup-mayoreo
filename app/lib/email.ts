import { Resend } from "resend";
import { fmx } from "./lotes";

// Remitente (debe ser del dominio verificado en Resend)
export const EMAIL_NEGOCIO = "ventas@themakeup.com.mx";
// A dónde llega el aviso interno de "¡Nueva venta!" (buzón Titan ventas@).
// Se puede sobreescribir en Vercel con la variable EMAIL_AVISOS_VENTAS.
export const EMAIL_AVISOS =
  process.env.EMAIL_AVISOS_VENTAS || EMAIL_NEGOCIO;

export function emailConfigurado(): boolean {
  const k = process.env.RESEND_API_KEY || "";
  return k.startsWith("re_") && !k.includes("PEGA-AQUI");
}

type ItemOrden = {
  tipo: "producto" | "lote";
  ref: string;
  nombre: string;
  precio: number;
  qty: number;
  piezas?: number;
};
type Envio = {
  nombre?: string;
  telefono?: string;
  email?: string;
  calle?: string;
  numero?: string;
  colonia?: string;
  cp?: string;
  ciudad?: string;
  estado?: string;
  referencias?: string;
};
export type OrdenCorreo = {
  id: string;
  items: ItemOrden[];
  total: number;
  envio: Envio | null;
  cliente: string | null;
  email: string | null;
};

const C = {
  charcoal: "#2C2420",
  rose: "#C9807A",
  roseDk: "#9E5550",
  gold: "#C9A96E",
  cream: "#FAF6F0",
  text: "#3A2E2A",
  muted: "#8A7068",
};

function filasItems(items: ItemOrden[]): string {
  return items
    .map(
      (it) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #eee;color:${C.text};font-size:14px">
          ${it.qty}× ${it.nombre}${it.tipo === "lote" ? " <span style='color:#9E5550'>(lote)</span>" : ""}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #eee;color:${C.charcoal};font-size:14px;text-align:right;white-space:nowrap">
          ${fmx(it.precio * it.qty)}
        </td>
      </tr>`
    )
    .join("");
}

function bloqueEnvio(e: Envio | null): string {
  if (!e) return "";
  const dir = [
    `${e.calle || ""} ${e.numero || ""}`.trim(),
    e.colonia,
    e.cp ? `C.P. ${e.cp}` : "",
    e.ciudad,
    e.estado,
  ]
    .filter(Boolean)
    .join(", ");
  return `
    <p style="margin:6px 0;color:${C.text};font-size:14px"><b>${e.nombre || ""}</b><br>
    📞 ${e.telefono || "-"}<br>
    📍 ${dir}${e.referencias ? `<br><span style="color:${C.muted}">Ref: ${e.referencias}</span>` : ""}</p>`;
}

function envoltura(marca: string, titulo: string, cuerpo: string): string {
  return `
  <div style="background:${C.cream};padding:24px 12px;font-family:Helvetica,Arial,sans-serif">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #eee">
      <div style="background:${C.charcoal};padding:20px 24px">
        <div style="color:${C.gold};font-size:20px;font-weight:bold;letter-spacing:1px">${marca}</div>
      </div>
      <div style="padding:24px">
        <h1 style="color:${C.charcoal};font-size:22px;margin:0 0 14px">${titulo}</h1>
        ${cuerpo}
      </div>
      <div style="background:${C.cream};padding:16px 24px;color:${C.muted};font-size:12px;text-align:center">
        The Makeup Mayoreo CDMX · Pago seguro con Mercado Pago
      </div>
    </div>
  </div>`;
}

function tablaTotales(o: OrdenCorreo): string {
  return `
    <table style="width:100%;border-collapse:collapse;margin:8px 0">${filasItems(o.items)}
      <tr><td style="padding:12px 0 0;color:${C.muted};font-size:15px">Total</td>
      <td style="padding:12px 0 0;text-align:right;color:${C.charcoal};font-size:20px;font-weight:bold">${fmx(o.total)}</td></tr>
    </table>`;
}

export async function enviarCorreosVenta(o: OrdenCorreo): Promise<void> {
  if (!emailConfigurado()) {
    console.log("[email] RESEND_API_KEY no configurada; se omite el envío.");
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const hayLote = o.items.some((i) => i.tipo === "lote");
  const marca = hayLote ? "The Makeup Mayoreo" : "AMAREA";
  const from = `${marca} <${EMAIL_NEGOCIO}>`;
  const nombre = o.cliente || o.envio?.nombre || "cliente";

  // --- Correo al CLIENTE ---
  if (o.email) {
    const cuerpoCliente = `
      <p style="color:${C.text};font-size:15px;margin:0 0 16px">¡Hola ${nombre}! Recibimos tu pago y tu pedido está confirmado. 💄</p>
      ${tablaTotales(o)}
      <h3 style="color:${C.charcoal};font-size:15px;margin:20px 0 6px">Datos de envío</h3>
      ${bloqueEnvio(o.envio)}
      <p style="color:${C.muted};font-size:13px;margin-top:18px">El costo de envío se coordina por WhatsApp. Te contactamos para confirmar la entrega.</p>`;
    try {
      await resend.emails.send({
        from,
        to: o.email,
        subject: `Confirmación de tu pedido · ${marca}`,
        html: envoltura(marca, "¡Gracias por tu compra!", cuerpoCliente),
      });
    } catch (err) {
      console.error("[email] cliente falló:", err);
    }
  }

  // --- Correo al NEGOCIO ---
  const cuerpoNegocio = `
    <p style="color:${C.text};font-size:15px;margin:0 0 16px">Entró una venta web (${marca}). Prepárala para envío:</p>
    ${tablaTotales(o)}
    <h3 style="color:${C.charcoal};font-size:15px;margin:20px 0 6px">Enviar a:</h3>
    ${bloqueEnvio(o.envio)}
    <p style="color:${C.muted};font-size:12px;margin-top:16px">Orden ${o.id}${hayLote ? " · incluye lote(s): prepara y descuenta inventario manualmente" : ""}</p>`;
  try {
    await resend.emails.send({
      from,
      to: EMAIL_AVISOS,
      replyTo: o.email || undefined,
      subject: `🛍️ ¡Nueva venta! ${fmx(o.total)} · ${marca}`,
      html: envoltura(marca, "¡Nueva venta!", cuerpoNegocio),
    });
  } catch (err) {
    console.error("[email] negocio falló:", err);
  }
}
