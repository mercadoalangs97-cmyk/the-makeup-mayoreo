// Google Analytics 4. El Measurement ID es PÚBLICO (no es un secreto: se expone
// en el navegador de todos modos), por eso puede ir aquí. Si algún día cambia,
// se puede sobreescribir con la variable NEXT_PUBLIC_GA_ID en Vercel.
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-FX6JGB8NGC";

type Params = Record<string, unknown>;

// Envía un evento a GA4 (solo si gtag ya cargó en el navegador). En el servidor
// no hace nada, así que es seguro llamarlo desde cualquier componente.
export function gaEvent(name: string, params: Params = {}): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as { gtag?: (...a: unknown[]) => void };
  if (typeof w.gtag === "function") w.gtag("event", name, params);
}

// ---- Eventos de e-commerce (formato estándar GA4) ----

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
}

// La compra se dispara en /checkout/exito leyendo lo que se guardó al iniciar el
// pago (valor + id de la orden), para poder mandar el VALOR real de la venta.
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
}
