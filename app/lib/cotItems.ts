import { LOTES, parcelsDeItems, type Paquete } from "./lotes";
import { createAdminSupabase } from "./supabase";

// Una cotización puede llevar un lote, productos sueltos, un lote armado a la
// medida ("personalizado"), o cualquier mezcla.
// Lotes y productos: se guarda solo QUÉ lleva y los PRECIOS se recalculan
// siempre en el servidor. Personalizados: el precio lo define la dueña al
// crear la cotización (sesión autenticada del panel) y queda GUARDADO en la
// cotización — la clienta no puede alterarlo porque /pagar lee lo guardado.
export type ItemCot = {
  tipo: "lote" | "producto" | "personalizado";
  ref: string;
  qty: number;
  /** Solo en personalizados (definidos al crear, con sesión del panel). */
  nombre?: string;
  precio?: number; // importe TOTAL de una unidad, ya con comisión si se sumó
  piezas?: number;
  descripcion?: string;
};

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
    const tipo =
      o?.tipo === "producto"
        ? ("producto" as const)
        : o?.tipo === "personalizado"
        ? ("personalizado" as const)
        : ("lote" as const);
    const ref = String(o?.ref ?? "").trim();
    const qty = Math.min(99, Math.max(1, Math.floor(Number(o?.qty) || 1)));
    if (tipo === "personalizado") {
      const nombre = String(o?.nombre ?? "").trim().slice(0, 120);
      const precio = Math.min(500000, Math.max(0, Math.round(Number(o?.precio) || 0)));
      const piezas = Math.min(5000, Math.max(0, Math.floor(Number(o?.piezas) || 0)));
      const descripcion = String(o?.descripcion ?? "").trim().slice(0, 300) || undefined;
      if (nombre && precio > 0) {
        out.push({ tipo, ref: ref || "nuevo", qty, nombre, precio, piezas, descripcion });
      }
      continue;
    }
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
    if (it.tipo === "personalizado") {
      // Precio y nombre vienen GUARDADOS (los definió la dueña al crear).
      if (!it.nombre || !(Number(it.precio) > 0)) {
        return { ...vacio, error: "Personalizado incompleto." };
      }
      resueltos.push({
        ...it,
        nombre: it.nombre,
        precio: it.precio!,
        piezas: it.piezas || 0,
        importe: it.precio! * it.qty,
        stock: null,
      });
      continue;
    }
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
      // El personalizado empaca igual que un lote de sus piezas.
      tipo: i.tipo === "producto" ? ("producto" as const) : ("lote" as const),
      id: (i.tipo === "producto" ? "prod:" : "lote:") + i.ref,
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
