import { createAdminSupabase } from "./supabase";

// Antifraude (Alan, 12-nov-2026). Un comprador con tarjetas que no eran suyas
// hizo 3 compras grandes en la tienda (14-oct, 21-oct y 9-nov), cada una con
// otro correo desechable, y luego vinieron los contracargos. Dos defensas:
//  1. Bloqueo: teléfono, dirección o dominio de correo en mk_config.bloqueos
//     no llegan a pagar (checkout y pago de cotización).
//  2. Revisión: un pago con tarjeta grande de alguien que nunca escribió por
//     WhatsApp queda "en revisión" (sale de Despacho, que solo lista
//     "pagado%") hasta que el equipo lo aprueba desde el bot de Telegram.

export type Bloqueos = {
  telefonos?: string[];
  dominios?: string[];
  direcciones?: { cp: string; calle: string; numero: string }[];
};

export const ESTADO_REVISION = "en revisión";
export const MENSAJE_BLOQUEO =
  "No pudimos procesar tu pedido en línea. Escríbenos por WhatsApp y te ayudamos a completarlo.";
const TARJETAS = new Set(["credit_card", "debit_card", "prepaid_card"]);

const tel10 = (v: unknown) => String(v ?? "").replace(/\D/g, "").slice(-10);
const plano = (v: unknown) =>
  String(v ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

async function leerConfig<T>(clave: string, defecto: T): Promise<T> {
  try {
    const { data } = await createAdminSupabase().from("mk_config").select("valor").eq("clave", clave).maybeSingle();
    return (data?.valor as T) ?? defecto;
  } catch {
    return defecto;
  }
}

/** ¿Este comprador está bloqueado? Compara teléfono, dominio del correo y calle + número + C.P. */
export async function compradorBloqueado(d: { telefono?: string; email?: string; cp?: string; calle?: string; numero?: string }): Promise<boolean> {
  const b = await leerConfig<Bloqueos>("bloqueos", {});
  const tel = tel10(d.telefono);
  if (tel.length === 10 && (b.telefonos || []).some((t) => tel10(t) === tel)) return true;
  const dominio = String(d.email || "").split("@")[1]?.trim().toLowerCase();
  if (dominio && (b.dominios || []).some((x) => x.toLowerCase() === dominio)) return true;
  const calle = plano(d.calle);
  const numero = plano(d.numero).split(" ")[0];
  return (b.direcciones || []).some(
    (x) => String(x.cp) === String(d.cp || "").replace(/\D/g, "") && calle.includes(plano(x.calle)) && numero === plano(x.numero)
  );
}

/**
 * ¿Este pago aprobado se queda en revisión? Tarjeta, monto desde el umbral
 * (mk_config.revision.umbral, $5,000 si no hay) y el teléfono nunca escribió
 * por WhatsApp. Devuelve el motivo o null.
 */
export async function motivoRevision(p: { tipoPago?: string | null; monto: number; telefono?: string | null }): Promise<string | null> {
  if (!TARJETAS.has(String(p.tipoPago || ""))) return null;
  const { umbral = 5000, activa = true } = await leerConfig<{ umbral?: number; activa?: boolean }>("revision", {});
  if (!activa || p.monto < umbral) return null;
  const tel = tel10(p.telefono);
  if (tel.length === 10) {
    const { data } = await createAdminSupabase()
      .from("mk_conversaciones")
      .select("canal_id")
      .or(`telefono.eq.${tel},canal_id.like.*${tel}`)
      .not("ultimo_cliente_en", "is", null)
      .limit(1);
    if (data?.length) return null;
  }
  return `Pago con tarjeta de $${p.monto.toLocaleString("es-MX")} de alguien que nunca ha escrito por WhatsApp`;
}
