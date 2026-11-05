// ============================================================================
//  PRECIO POR CANTIDAD ("mayoreo")
// ============================================================================
// Algunos productos bajan de precio al llegar a un mínimo de piezas. El mínimo
// NO se cuenta por color: se cuenta por FAMILIA, porque la clienta que lleva 6
// puffs de tres colores distintos está comprando 6 puffs. Contarlo por color
// sería pedirle 6 del mismo tono para darle el precio, que no es el trato.
//
// El precio final SIEMPRE lo recalcula el servidor en /api/checkout: lo que
// vive en el navegador es para que la clienta lo vea venir, no para cobrar.

export type Mayoreo = {
  /** Precio por pieza una vez alcanzado el mínimo. */
  precio: number;
  /** Piezas mínimas, sumando toda la familia. */
  desde: number;
  /** Agrupa los colores de un mismo producto, ej. "puff-sweetbeauty". */
  familia: string;
  /** Condición que la clienta debe leer, ej. "se envían surtidos". */
  nota?: string | null;
};

export type ConMayoreo = {
  qty: number;
  precio: number;
  mayoreo?: Mayoreo | null;
};

/** Normaliza lo que viene de la base; null si al producto le falta un dato. */
export function mayoreoDeFila(p: {
  mayoreo_precio?: number | null;
  mayoreo_desde?: number | null;
  mayoreo_familia?: string | null;
  mayoreo_nota?: string | null;
}): Mayoreo | null {
  const precio = Number(p.mayoreo_precio) || 0;
  const desde = Math.floor(Number(p.mayoreo_desde) || 0);
  const familia = (p.mayoreo_familia || "").trim();
  if (precio <= 0 || desde <= 1 || !familia) return null;
  return { precio, desde, familia, nota: p.mayoreo_nota ?? null };
}

/** Familias que ya alcanzaron su mínimo en esta lista de renglones. */
export function familiasEnMayoreo(items: ConMayoreo[]): Set<string> {
  const porFamilia = new Map<string, { piezas: number; desde: number }>();
  for (const it of items) {
    const m = it.mayoreo;
    if (!m) continue;
    const acc = porFamilia.get(m.familia) || { piezas: 0, desde: m.desde };
    acc.piezas += Math.max(0, Number(it.qty) || 0);
    // Si dos colores tuvieran mínimos distintos, manda el más accesible.
    acc.desde = Math.min(acc.desde, m.desde);
    porFamilia.set(m.familia, acc);
  }
  const listas = new Set<string>();
  porFamilia.forEach((v, familia) => {
    if (v.piezas >= v.desde) listas.add(familia);
  });
  return listas;
}

/** Precio por pieza de un renglón, ya con el mayoreo aplicado si toca. */
export function precioUnitario(it: ConMayoreo, familias: Set<string>): number {
  const m = it.mayoreo;
  if (m && familias.has(m.familia)) return m.precio;
  return Number(it.precio) || 0;
}

/** Total de la lista con el mayoreo ya aplicado. */
export function totalConMayoreo(items: ConMayoreo[]): number {
  const familias = familiasEnMayoreo(items);
  return items.reduce(
    (a, it) => a + precioUnitario(it, familias) * (Number(it.qty) || 0),
    0
  );
}

/** Lo que se ahorró contra el precio de pieza suelta. */
export function ahorroMayoreo(items: ConMayoreo[]): number {
  const lista = items.reduce((a, it) => a + (Number(it.precio) || 0) * (Number(it.qty) || 0), 0);
  return Math.max(0, Math.round(lista - totalConMayoreo(items)));
}

export type AvisoMayoreo = {
  familia: string;
  /** 0 = ya tiene el precio de mayoreo. */
  faltan: number;
  precio: number;
  desde: number;
  nota?: string | null;
};

/**
 * Qué decirle a la clienta por cada familia que trae en el carrito: o ya
 * alcanzó el mayoreo, o le faltan N piezas. Es el empujón más barato que hay
 * para subir el ticket, así que vale la pena mostrarlo.
 */
export function avisosMayoreo(items: ConMayoreo[]): AvisoMayoreo[] {
  const porFamilia = new Map<string, { piezas: number; m: Mayoreo }>();
  for (const it of items) {
    const m = it.mayoreo;
    if (!m) continue;
    const acc = porFamilia.get(m.familia) || { piezas: 0, m };
    acc.piezas += Math.max(0, Number(it.qty) || 0);
    if (m.desde < acc.m.desde) acc.m = m;
    porFamilia.set(m.familia, acc);
  }
  const out: AvisoMayoreo[] = [];
  porFamilia.forEach((v, familia) => {
    out.push({
      familia,
      faltan: Math.max(0, v.m.desde - v.piezas),
      precio: v.m.precio,
      desde: v.m.desde,
      nota: v.m.nota ?? null,
    });
  });
  return out;
}
