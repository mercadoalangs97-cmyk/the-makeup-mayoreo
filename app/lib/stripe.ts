import { createHmac, timingSafeEqual } from "node:crypto";

// =====================================================================
// STRIPE (20-nov-2026) — reemplaza a Mercado Pago, que cerró la cuenta.
// Se usa la página de pago HOSPEDADA de Stripe (Checkout), igual que antes
// con Mercado Pago: nosotros nunca vemos datos de tarjeta.
//
// Contracargos: se pide 3D Secure en TODAS las tarjetas
// (request_three_d_secure=any). Si el banco autentica al tarjetahabiente, un
// contracargo por "yo no lo compré" lo absorbe el banco, no nosotros.
//
// Variables (Vercel):
//   STRIPE_SECRET_KEY      sk_live_… (o sk_test_… para pruebas)
//   STRIPE_WEBHOOK_SECRET  whsec_… (del endpoint /api/stripe/webhook)
// Los METODOS (tarjeta, OXXO…) se activan en el Dashboard de Stripe
// (Configuración → Métodos de pago); en cuentas nuevas Stripe ya no acepta
// que el código los fije.
// Sin dependencias: se llama a la API con fetch.
// =====================================================================

const API = "https://api.stripe.com/v1";

export function stripeConfigurado(): boolean {
  const k = process.env.STRIPE_SECRET_KEY || "";
  return /^(sk|rk)_(live|test)_/.test(k);
}
export function stripeModoPrueba(): boolean {
  return (process.env.STRIPE_SECRET_KEY || "").includes("_test_");
}

// Codifica un objeto anidado como form-urlencoded al estilo de Stripe:
// {a:{b:1}, c:[x,y]} → a[b]=1&c[0]=x&c[1]=y
function aForm(obj: Record<string, unknown>, pref = "", out: string[] = []): string[] {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const clave = pref ? `${pref}[${k}]` : k;
    if (Array.isArray(v)) {
      v.forEach((x, i) => {
        if (x !== null && typeof x === "object") aForm(x as Record<string, unknown>, `${clave}[${i}]`, out);
        else out.push(`${encodeURIComponent(`${clave}[${i}]`)}=${encodeURIComponent(String(x))}`);
      });
    } else if (typeof v === "object") {
      aForm(v as Record<string, unknown>, clave, out);
    } else {
      out.push(`${encodeURIComponent(clave)}=${encodeURIComponent(String(v))}`);
    }
  }
  return out;
}

export async function stripeApi<T = Record<string, unknown>>(
  metodo: "GET" | "POST",
  ruta: string,
  datos?: Record<string, unknown>,
  opciones?: { idempotencia?: string }
): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Falta STRIPE_SECRET_KEY");
  const cuerpo = datos ? aForm(datos).join("&") : "";
  const url = metodo === "GET" && cuerpo ? `${API}${ruta}?${cuerpo}` : `${API}${ruta}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (opciones?.idempotencia) headers["Idempotency-Key"] = opciones.idempotencia;
  const r = await fetch(url, {
    method: metodo,
    headers,
    body: metodo === "POST" ? cuerpo : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (!r.ok) {
    const err = (j.error || {}) as { message?: string; code?: string; param?: string };
    const e = new Error(err.message || `Stripe ${r.status}`) as Error & { code?: string; param?: string };
    e.code = err.code;
    e.param = err.param;
    throw e;
  }
  return j as T;
}

export type LineaCobro = { nombre: string; precio: number; qty: number };

/**
 * Crea la página de pago. `ref` es lo que antes era external_reference de MP:
 * el id de la orden, o "APART-<cotizacion>" para un anticipo.
 */
export async function crearCobro(p: {
  ref: string;
  lineas: LineaCobro[];
  email?: string | null;
  exito: string;
  cancelar: string;
  metadata?: Record<string, string>;
}): Promise<{ url: string; id: string }> {
  const lineas = p.lineas
    .filter((l) => l.qty > 0 && l.precio > 0)
    .map((l) => ({
      quantity: Math.round(l.qty),
      price_data: {
        currency: "mxn",
        unit_amount: Math.round(l.precio * 100),
        product_data: { name: l.nombre.slice(0, 250) || "Producto" },
      },
    }));
  if (!lineas.length) throw new Error("No hay nada que cobrar");

  const md = { orden_id: p.ref, ...(p.metadata || {}) };
  const sesion = {
    mode: "payment",
    client_reference_id: p.ref,
    line_items: lineas,
    payment_method_options: {
      card: {
        request_three_d_secure: "any",
        // Meses sin intereses (México): Stripe los ofrece si la tarjeta y el
        // monto califican.
        installments: { enabled: true },
      },
      oxxo: { expires_after_days: 3 },
    },
    customer_email: p.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email) ? p.email : undefined,
    locale: "es-419",
    success_url: p.exito,
    cancel_url: p.cancelar,
    metadata: md,
    payment_intent_data: {
      description: `The Makeup · ${p.ref}`,
      metadata: md,
    },
  };
  let s: { id: string; url: string };
  try {
    s = await stripeApi("POST", "/checkout/sessions", sesion);
  } catch (e) {
    // Si OXXO aun no esta activado, sus opciones no deben tumbar el cobro.
    const msg = e instanceof Error ? e.message : String(e);
    if (/oxxo/i.test(msg)) {
      delete (sesion.payment_method_options as Record<string, unknown>).oxxo;
      s = await stripeApi("POST", "/checkout/sessions", sesion);
    } else throw e;
  }
  if (!s.url) throw new Error("Stripe no devolvió el enlace de pago");
  return { url: s.url, id: s.id };
}

/** Verifica la firma de Stripe (header Stripe-Signature). */
export function verificarFirma(cuerpo: string, firma: string | null, secreto: string, toleranciaSeg = 600): boolean {
  if (!firma || !secreto) return false;
  const partes = Object.fromEntries(
    firma.split(",").map((x) => {
      const i = x.indexOf("=");
      return [x.slice(0, i), x.slice(i + 1)];
    })
  ) as Record<string, string>;
  const t = Number(partes.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > toleranciaSeg) return false;
  const esperado = createHmac("sha256", secreto).update(`${t}.${cuerpo}`).digest("hex");
  const v1s = firma
    .split(",")
    .filter((x) => x.startsWith("v1="))
    .map((x) => x.slice(3));
  return v1s.some((v) => {
    try {
      return timingSafeEqual(Buffer.from(v, "hex"), Buffer.from(esperado, "hex"));
    } catch {
      return false;
    }
  });
}
