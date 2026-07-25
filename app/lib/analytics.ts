// Google Analytics 4. El Measurement ID es PÚBLICO. Override con NEXT_PUBLIC_GA_ID.
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-FX6JGB8NGC";
// Meta (Facebook) Pixel — vacío hasta poner el ID en NEXT_PUBLIC_META_PIXEL_ID
// (Vercel). Mientras esté vacío, no carga y los eventos de Meta son no-op.
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "";
// Google Ads — vacío hasta configurarlo en Vercel (inerte mientras tanto).
// NEXT_PUBLIC_GOOGLE_ADS_ID = "AW-XXXXXXXXXX"; los LABEL salen de cada acción
// de conversión que crees en Google Ads (compra / contacto).
export const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "";
export const GOOGLE_ADS_LABEL_COMPRA =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_LABEL_COMPRA || "";
export const GOOGLE_ADS_LABEL_LEAD =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_LABEL_LEAD || "";

type Params = Record<string, unknown>;

// Evento a GA4 (solo si gtag ya cargó). En el servidor no hace nada.
export function gaEvent(name: string, params: Params = {}): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as { gtag?: (...a: unknown[]) => void };
  if (typeof w.gtag === "function") w.gtag("event", name, params);
}

// Evento equivalente al Meta Pixel (si está cargado). Los "standard events" de
// Meta permiten optimizar campañas de Facebook/Instagram por conversión.
function fbq(name: string, params: Params = {}): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as { fbq?: (...a: unknown[]) => void };
  if (typeof w.fbq === "function") w.fbq("track", name, params);
}

// Conversión de Google Ads (si hay ID + label). Reutiliza el mismo gtag de GA4.
function adsConversion(label: string, params: Params = {}): void {
  if (typeof window === "undefined" || !GOOGLE_ADS_ID || !label) return;
  const w = window as unknown as { gtag?: (...a: unknown[]) => void };
  if (typeof w.gtag === "function")
    w.gtag("event", "conversion", {
      send_to: `${GOOGLE_ADS_ID}/${label}`,
      ...params,
    });
}

// ---- Eventos de e-commerce (GA4 estándar + espejo en Meta) ----

export function gaViewItem(p: {
  sku: string;
  nombre: string;
  marca?: string | null;
  categoria?: string | null;
  precio: number;
}): void {
  gaEvent("view_item", {
    currency: "MXN",
    value: p.precio,
    items: [
      {
        item_id: p.sku,
        item_name: p.nombre,
        item_brand: p.marca ?? undefined,
        item_category: p.categoria ?? undefined,
        price: p.precio,
        quantity: 1,
      },
    ],
  });
  fbq("ViewContent", {
    content_ids: [p.sku],
    content_name: p.nombre,
    content_type: "product",
    value: p.precio,
    currency: "MXN",
  });
}

export function gaAddToCart(
  item: { id: string; nombre: string; precio: number; sub?: string },
  qty: number
): void {
  gaEvent("add_to_cart", {
    currency: "MXN",
    value: item.precio * qty,
    items: [
      {
        item_id: item.id,
        item_name: item.nombre,
        item_brand: item.sub,
        price: item.precio,
        quantity: qty,
      },
    ],
  });
  fbq("AddToCart", {
    content_ids: [item.id],
    content_name: item.nombre,
    content_type: "product",
    value: item.precio * qty,
    currency: "MXN",
  });
}

export function gaBeginCheckout(
  items: { id: string; nombre: string; precio: number; qty: number; sub?: string }[],
  value: number
): void {
  gaEvent("begin_checkout", {
    currency: "MXN",
    value,
    items: items.map((it) => ({
      item_id: it.id,
      item_name: it.nombre,
      item_brand: it.sub,
      price: it.precio,
      quantity: it.qty,
    })),
  });
  fbq("InitiateCheckout", {
    content_ids: items.map((it) => it.id),
    content_type: "product",
    num_items: items.reduce((s, it) => s + it.qty, 0),
    value,
    currency: "MXN",
  });
}

export function gaPurchase(data: {
  id: string;
  value: number;
  items?: { item_id: string; item_name: string; price: number; quantity: number }[];
}): void {
  gaEvent("purchase", {
    transaction_id: data.id || undefined,
    currency: "MXN",
    value: data.value,
    items: data.items,
  });
  fbq("Purchase", {
    content_ids: (data.items || []).map((i) => i.item_id),
    content_type: "product",
    value: data.value,
    currency: "MXN",
  });
  adsConversion(GOOGLE_ADS_LABEL_COMPRA, {
    value: data.value,
    currency: "MXN",
    transaction_id: data.id || undefined,
  });
}

// ---- Lead (contacto por WhatsApp/correo/tel) — clave para el MAYOREO ----
// GA4: generate_lead (conversión estándar que Google Ads reconoce) + un evento
// con la fuente exacta. Meta: Lead.
export function gaLead(fuente: string): void {
  gaEvent("generate_lead", { method: fuente });
  gaEvent("contacto_whatsapp", { fuente });
  fbq("Lead", { content_name: fuente });
  adsConversion(GOOGLE_ADS_LABEL_LEAD, { currency: "MXN" });
}

// ---- Búsqueda en el catálogo ----
export function gaSearch(term: string): void {
  const t = (term || "").trim();
  if (t.length < 2) return;
  gaEvent("search", { search_term: t });
  fbq("Search", { search_string: t });
}
