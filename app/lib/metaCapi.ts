import { createHash } from "node:crypto";
import { META_PIXEL_ID } from "./analytics";

// ---------------------------------------------------------------------------
// Conversions API de Meta — la venta contada desde el SERVIDOR.
//
// El pixel del navegador solo alcanza a mandar "Purchase" si la clienta REGRESA
// de Mercado Pago a /checkout/exito. La que paga en el celular y cierra la
// pestaña no se cuenta, y ese es el caso más común porque el link de cotización
// se manda por WhatsApp. Aquí la venta se manda desde el webhook de MP, que es
// la única señal segura de que el dinero entró.
//
// Los dos eventos llevan el MISMO event_id, así que Meta los reconoce como uno
// solo: si la clienta sí regresó, no se cuenta doble.
// ---------------------------------------------------------------------------

const TOKEN = process.env.META_CAPI_TOKEN || "";
const API = "https://graph.facebook.com/v21.0";

export function capiConfigurada(): boolean {
  return Boolean(TOKEN && META_PIXEL_ID);
}

// Meta exige los datos personales en SHA-256, nunca en claro.
function sha(valor?: string | null): string | undefined {
  const v = (valor || "").trim().toLowerCase();
  if (!v) return undefined;
  return createHash("sha256").update(v).digest("hex");
}

// Teléfono: solo dígitos y con lada de país. Un número mexicano de 10 dígitos
// sin el 52 no empata con nadie en Meta.
function shaTel(tel?: string | null): string | undefined {
  let d = (tel || "").replace(/\D/g, "");
  if (!d) return undefined;
  if (d.length === 10) d = "52" + d;
  if (d.length === 12 && d.startsWith("521")) d = "52" + d.slice(3);
  return sha(d);
}

function shaCp(cp?: string | null): string | undefined {
  const d = (cp || "").replace(/\D/g, "");
  return d ? sha(d) : undefined;
}

export type CompraCapi = {
  /** Mismo id que manda el navegador, para que Meta no cuente doble. */
  eventId: string;
  /** Lo que realmente se cobró, en pesos. */
  valor: number;
  /** Cuándo entró el pago (ms). Si se omite, ahora. */
  cuando?: number;
  email?: string | null;
  telefono?: string | null;
  nombre?: string | null;
  ciudad?: string | null;
  estado?: string | null;
  cp?: string | null;
  contentIds?: string[];
  numItems?: number;
  /** Página donde ocurrió la compra (ayuda a la atribución). */
  urlOrigen?: string | null;
};

/**
 * Manda un Purchase a Meta. Nunca lanza: si algo falla, el webhook de Mercado
 * Pago tiene que seguir su curso — perder una medición no puede costar una venta.
 */
export async function metaPurchase(c: CompraCapi): Promise<{
  ok: boolean;
  motivo?: string;
}> {
  if (!capiConfigurada()) return { ok: false, motivo: "sin_token" };

  const partes = (c.nombre || "").trim().split(/\s+/).filter(Boolean);
  const nombre = partes[0];
  const apellido = partes.length > 1 ? partes.slice(1).join(" ") : undefined;

  const userData: Record<string, unknown> = {
    em: sha(c.email),
    ph: shaTel(c.telefono),
    fn: sha(nombre),
    ln: sha(apellido),
    ct: sha((c.ciudad || "").replace(/\s+/g, "")),
    st: sha((c.estado || "").replace(/\s+/g, "")),
    zp: shaCp(c.cp),
    country: sha("mx"),
  };
  Object.keys(userData).forEach((k) => {
    if (userData[k] === undefined) delete userData[k];
  });

  const evento = {
    event_name: "Purchase",
    event_time: Math.floor((c.cuando || Date.now()) / 1000),
    event_id: c.eventId,
    action_source: "website",
    event_source_url: c.urlOrigen || undefined,
    user_data: userData,
    custom_data: {
      currency: "MXN",
      value: Number(c.valor.toFixed(2)),
      content_type: "product",
      content_ids: c.contentIds && c.contentIds.length ? c.contentIds : undefined,
      num_items: c.numItems,
    },
  };

  try {
    const res = await fetch(
      `${API}/${META_PIXEL_ID}/events?access_token=${encodeURIComponent(TOKEN)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: [evento] }),
      }
    );
    if (!res.ok) {
      const txt = await res.text();
      console.error("[meta-capi] rechazado:", res.status, txt.slice(0, 300));
      return { ok: false, motivo: `http_${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    console.error("[meta-capi] error de red:", e);
    return { ok: false, motivo: "red" };
  }
}
