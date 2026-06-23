import { Resend } from "resend";
import { fmx, WPP } from "./lotes";

// Remitente (debe ser del dominio verificado en Resend)
export const EMAIL_NEGOCIO = "ventas@themakeup.com.mx";
// A dónde llega el aviso interno de "¡Nueva venta!" (buzón Titan ventas@).
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
  foto?: string | null;
};
type Envio = {
  nombre?: string; telefono?: string; email?: string; calle?: string;
  numero?: string; colonia?: string; cp?: string; ciudad?: string;
  estado?: string; referencias?: string;
  costo_cobrado?: number; // envío cobrado al cliente (0 = gratis)
  modo?: "amarea" | "coordinar"; // amarea = tarifa fija/gratis; coordinar = lotes
};
export type OrdenCorreo = {
  id: string;
  items: ItemOrden[];
  total: number;
  envio: Envio | null;
  cliente: string | null;
  email: string | null;
  mp_fee?: number | null;
  mp_neto?: number | null;
};

const C = {
  charcoal: "#2C2420", rose: "#C9807A", roseDk: "#9E5550", gold: "#C9A96E",
  goldLt: "#E8D5A8", cream: "#FAF6F0", text: "#3A2E2A", muted: "#8A7068",
  border: "#ece3d6",
};

function pedidoNum(id: string): string {
  return "#" + id.slice(0, 8).toUpperCase();
}

// Fila de producto con foto + texto (nombre/precio en texto por si bloquean imágenes)
function filaItem(it: ItemOrden): string {
  const img = it.foto
    ? `<img src="${it.foto}" width="56" height="56" alt="${it.nombre}" style="display:block;width:56px;height:56px;border-radius:8px;object-fit:cover;background:#fff;border:1px solid ${C.border}">`
    : `<div style="width:56px;height:56px;border-radius:8px;background:${C.cream};text-align:center;line-height:56px;font-size:24px">💄</div>`;
  return `
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid ${C.border};width:56px;vertical-align:top">${img}</td>
    <td style="padding:10px 12px;border-bottom:1px solid ${C.border};vertical-align:top;color:${C.text};font-size:14px;line-height:1.4">
      ${it.nombre}${it.tipo === "lote" ? ` <span style="color:${C.roseDk}">(lote)</span>` : ""}
      <br><span style="color:${C.muted};font-size:12px">Cantidad: ${it.qty} · ${fmx(it.precio)} c/u</span>
    </td>
    <td style="padding:10px 0;border-bottom:1px solid ${C.border};text-align:right;vertical-align:top;color:${C.charcoal};font-size:14px;font-weight:bold;white-space:nowrap">
      ${fmx(it.precio * it.qty)}
    </td>
  </tr>`;
}

function tablaItems(items: ItemOrden[]): string {
  return `<table role="presentation" style="width:100%;border-collapse:collapse">${items
    .map(filaItem)
    .join("")}</table>`;
}

function bloqueEnvio(e: Envio | null): string {
  if (!e) return "";
  const dir = [
    `${e.calle || ""} ${e.numero || ""}`.trim(), e.colonia,
    e.cp ? `C.P. ${e.cp}` : "", e.ciudad, e.estado,
  ].filter(Boolean).join(", ");
  return `
    <p style="margin:6px 0;color:${C.text};font-size:14px;line-height:1.6">
      <b>${e.nombre || ""}</b><br>
      📱 ${e.telefono || "-"}<br>
      📍 ${dir}${e.referencias ? `<br><span style="color:${C.muted}">Referencias: ${e.referencias}</span>` : ""}
    </p>`;
}

function envoltura(marca: string, titulo: string, sub: string, cuerpo: string): string {
  return `
  <div style="background:${C.cream};padding:24px 12px;font-family:Helvetica,Arial,sans-serif">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid ${C.border}">
      <div style="background:${C.charcoal};padding:22px 24px">
        <div style="color:${C.gold};font-size:22px;font-weight:bold;letter-spacing:2px">${marca}</div>
      </div>
      <div style="padding:24px">
        <h1 style="color:${C.charcoal};font-size:22px;margin:0 0 4px">${titulo}</h1>
        <p style="color:${C.muted};font-size:13px;margin:0 0 18px">${sub}</p>
        ${cuerpo}
      </div>
      <div style="background:${C.cream};padding:16px 24px;color:${C.muted};font-size:12px;text-align:center;line-height:1.6">
        The Makeup Mayoreo CDMX · Pago seguro con Mercado Pago<br>
        ¿Dudas? WhatsApp <a href="https://wa.me/${WPP}" style="color:${C.roseDk}">+52 55 4381 3568</a>
      </div>
    </div>
  </div>`;
}

function totalRow(label: string, valor: string, fuerte = false): string {
  return `<tr>
    <td style="padding:6px 0 0;color:${C.muted};font-size:${fuerte ? 15 : 13}px">${label}</td>
    <td style="padding:6px 0 0;text-align:right;color:${C.charcoal};font-size:${fuerte ? 20 : 13}px;font-weight:${fuerte ? "bold" : "normal"}">${valor}</td>
  </tr>`;
}

// HTML del correo al CLIENTE
export function htmlCliente(o: OrdenCorreo): string {
  const marca = o.items.some((i) => i.tipo === "lote") ? "The Makeup Mayoreo" : "AMAREA";
  const nombre = o.cliente || o.envio?.nombre || "";
  const coordinar = o.envio?.modo === "coordinar";
  const envioCobrado = o.envio?.costo_cobrado ?? 0;
  const granTotal = o.total + (coordinar ? 0 : envioCobrado);
  const filaEnvio = coordinar
    ? totalRow("Envío", "Se coordina por WhatsApp")
    : totalRow("Envío", envioCobrado === 0 ? "Gratis" : fmx(envioCobrado));
  const mensajeEnvio = coordinar
    ? `📲 <b>Te contactaremos por WhatsApp</b> para coordinar el envío y su costo. Si algún dato de arriba está mal, respóndenos este correo.`
    : `📦 <b>Preparamos y enviamos tu pedido en 24–48 h.</b> Te avisaremos por WhatsApp con tu número de guía. Si algún dato de arriba está mal, respóndenos este correo.`;
  const cuerpo = `
    <p style="color:${C.text};font-size:15px;margin:0 0 16px">¡Hola ${nombre}! Recibimos tu pago y tu pedido está confirmado. 💄</p>
    ${tablaItems(o.items)}
    <table role="presentation" style="width:100%;border-collapse:collapse;margin-top:6px">
      ${totalRow("Subtotal", fmx(o.total))}
      ${filaEnvio}
      ${totalRow("Total pagado", fmx(granTotal), true)}
    </table>
    <h3 style="color:${C.charcoal};font-size:15px;margin:22px 0 6px">📦 Tus datos de envío</h3>
    ${bloqueEnvio(o.envio)}
    <p style="color:${C.text};font-size:14px;margin:16px 0 0;background:${C.cream};padding:12px 14px;border-radius:10px">
      ${mensajeEnvio}
    </p>
    <p style="text-align:center;margin:20px 0 0">
      <a href="https://wa.me/${WPP}" style="display:inline-block;background:#1DA851;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-size:14px;font-weight:bold">Escríbenos por WhatsApp</a>
    </p>`;
  return envoltura(marca, "¡Gracias por tu compra!", `Pedido ${pedidoNum(o.id)}`, cuerpo);
}

// HTML del correo al NEGOCIO
export function htmlNegocio(o: OrdenCorreo): string {
  const hayLote = o.items.some((i) => i.tipo === "lote");
  const marca = hayLote ? "The Makeup Mayoreo" : "AMAREA";
  const coordinar = o.envio?.modo === "coordinar";
  const envioCobrado = o.envio?.costo_cobrado ?? 0;
  const filaEnvio = coordinar
    ? totalRow("Envío", "Coordinar por WhatsApp")
    : totalRow("Envío cobrado", envioCobrado === 0 ? "Gratis" : fmx(envioCobrado));
  const cuerpo = `
    <p style="color:${C.text};font-size:15px;margin:0 0 16px">Entró una venta web. Prepárala para envío:</p>
    ${tablaItems(o.items)}
    <table role="presentation" style="width:100%;border-collapse:collapse;margin-top:6px">
      ${totalRow("Productos", fmx(o.total))}
      ${filaEnvio}
      ${o.mp_fee != null ? totalRow("Comisión Mercado Pago", "− " + fmx(o.mp_fee)) : ""}
      ${o.mp_neto != null ? totalRow("Neto recibido", fmx(o.mp_neto), true) : ""}
    </table>
    <h3 style="color:${C.charcoal};font-size:15px;margin:22px 0 6px">📦 Enviar a</h3>
    ${bloqueEnvio(o.envio)}
    ${hayLote ? `<p style="color:${C.roseDk};font-size:14px;background:#fbeeec;padding:12px 14px;border-radius:10px;margin-top:14px">⚠️ Incluye lote(s): requiere preparación manual y descuento de inventario desde el panel.</p>` : ""}
    <p style="color:${C.muted};font-size:12px;margin-top:16px">Orden ${o.id}</p>`;
  return envoltura(marca, "🛍️ ¡Nueva venta!", `Pedido ${pedidoNum(o.id)} · ${fmx(o.total)}`, cuerpo);
}

export async function enviarCorreosVenta(o: OrdenCorreo): Promise<void> {
  if (!emailConfigurado()) {
    console.log("[email] RESEND_API_KEY no configurada; se omite el envío.");
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const marca = o.items.some((i) => i.tipo === "lote") ? "The Makeup Mayoreo" : "AMAREA";
  const from = `${marca} <${EMAIL_NEGOCIO}>`;

  if (o.email) {
    try {
      await resend.emails.send({
        from, to: o.email,
        subject: `Confirmación de tu pedido ${pedidoNum(o.id)} · ${marca}`,
        html: htmlCliente(o),
      });
    } catch (err) {
      console.error("[email] cliente falló:", err);
    }
  }
  try {
    await resend.emails.send({
      from, to: EMAIL_AVISOS, replyTo: o.email || undefined,
      subject: `🛍️ ¡Nueva venta! ${fmx(o.total)} · ${marca}`,
      html: htmlNegocio(o),
    });
  } catch (err) {
    console.error("[email] negocio falló:", err);
  }
}
