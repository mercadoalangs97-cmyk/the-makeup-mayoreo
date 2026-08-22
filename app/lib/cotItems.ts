import { LOTES, parcelsDeItems, type Paquete } from "./lotes";
import { createAdminSupabase } from "./supabase";

// Una cotización puede llevar un lote, productos sueltos, o las dos cosas.
// Se guarda solo QUÉ lleva (tipo + sku + cantidad); los PRECIOS se recalculan
// siempre en el servidor, nunca se confía en lo que mande el navegador.
export type ItemCot = { tipo: "lote" | "producto"; ref: string; qty: number };

export type ItemResuelto = ItemCot & {
  nombre: string;
  precio: number;
  piezas: number; // piezas del lote (0 en productos sueltos)
  importe: number;
  /** Existencia del producto suelto (null en lotes, que salen del surtido). */
  stock: number | null;
};

export type CotResuelta = {
  items: ItemResuelto[];
  subtotal: number;
  piezasLote: number;
  parcels: Paquete[];
  error?: string;
};

/** Normaliza lo que llega del panel a una lista limpia y con topes. */
export function limpiarItems(raw: unknown): ItemCot[] {
  if (!Array.isArray(raw)) return [];
  const out: ItemCot[] = [];
  for (const r of raw.slice(0, 30)) {
    const o = r as Record<string, unknown>;
    const tipo = o?.tipo === "producto" ? "producto" : "lote";
    const ref = String(o?.ref ?? "").trim();
    const qty = Math.min(99, Math.max(1, Math.floor(Number(o?.qty) || 1)));
    if (ref) out.push({ tipo, ref, qty });
  }
  return out;
}

/**
 * Resuelve nombres y precios REALES de cada renglón.
 * Los lotes salen de LOTES; los productos, de la base (precio y existencia).
 */
export async function resolverItems(items: ItemCot[]): Promise<CotResuelta> {
  const vacio: CotResuelta = {
    items: [],
    subtotal: 0,
    piezasLote: 0,
    parcels: [],
  };
  if (!items.length) return { ...vacio, error: "La cotización va vacía." };

  const skus = items.filter((i) => i.tipo === "producto").map((i) => i.ref);
  const porSku = new Map<
    string,
    { nombre: string; precio: number; stock: number }
  >();
  if (skus.length) {
    const sb = createAdminSupabase();
    const { data } = await sb
      .from("productos")
      .select("sku,nombre,nombre_seo,precio_mxn,stock")
      .in("sku", skus);
    (data || []).forEach((p) => {
      porSku.set(p.sku, {
        nombre: (p.nombre_seo || p.nombre || p.sku) as string,
        precio: Number(p.precio_mxn) || 0,
        stock: Number(p.stock) || 0,
      });
    });
  }

  const resueltos: ItemResuelto[] = [];
  for (const it of items) {
    if (it.tipo === "lote") {
      const l = LOTES.find((x) => x.id === it.ref);
      if (!l) return { ...vacio, error: `Lote no válido: ${it.ref}` };
      resueltos.push({
        ...it,
        nombre: l.nombre,
        precio: l.precio,
        piezas: l.piezas,
        importe: l.precio * it.qty,
        stock: null,
      });
    } else {
      const p = porSku.get(it.ref);
      if (!p) return { ...vacio, error: `Producto no encontrado: ${it.ref}` };
      if (p.precio <= 0) {
        return { ...vacio, error: `${p.nombre} no tiene precio de venta.` };
      }
      resueltos.push({
        ...it,
        nombre: p.nombre,
        precio: p.precio,
        piezas: 0,
        importe: p.precio * it.qty,
        stock: p.stock,
      });
    }
  }

  const subtotal = resueltos.reduce((s, i) => s + i.importe, 0);
  const piezasLote = resueltos.reduce((s, i) => s + i.piezas * i.qty, 0);
  const parcels = parcelsDeItems(
    resueltos.map((i) => ({
      tipo: i.tipo,
      id: (i.tipo === "lote" ? "lote:" : "prod:") + i.ref,
      qty: i.qty,
      piezas: i.piezas,
    }))
  );

  return { items: resueltos, subtotal, piezasLote, parcels };
}

/** Compatibilidad: cotizaciones viejas guardadas con lote_id/qty. */
export function itemsDeCotizacion(cot: {
  items?: unknown;
  lote_id?: string | null;
  qty?: number | null;
}): ItemCot[] {
  const guardados = limpiarItems(cot.items);
  if (guardados.length) return guardados;
  if (cot.lote_id) {
    return [{ tipo: "lote", ref: cot.lote_id, qty: Math.max(1, Number(cot.qty) || 1) }];
  }
  return [];
}
