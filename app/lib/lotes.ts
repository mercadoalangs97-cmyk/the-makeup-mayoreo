// Datos de los lotes.
// NOTA: por ahora estan aqui en codigo (igual que en el index.html original).
// En una fase posterior esto se leera de la tabla `lotes_tienda` de Supabase.

export const BASE =
  "https://yekvehkmgunoafccwmyp.supabase.co/storage/v1/object/public/lotes-fotos";
export const WPP = "5215543813568";

// Umbral de envio gratis MAYOREO (MXN) — hero de /mayoreo (lotes grandes).
export const ENVIO_GRATIS_DESDE = 2500;

// Envío AMAREA (consumidor): GRATIS desde $599, si no $99 fijo.
// El cliente NO ve la tarifa real de Skydropx; eso se usa internamente.
export const ENVIO_AMAREA_GRATIS_DESDE = 599;
export const ENVIO_AMAREA_TARIFA = 129;

// Calcula el envío que VE y PAGA el cliente (NO el costo real de Skydropx).
//  - Si el carrito tiene algún lote de mayoreo → se coordina por WhatsApp
//    (devuelve null, no se cobra tarifa fija).
//  - Solo productos AMAREA → gratis desde $599, si no $99 fijo.
export function calcularEnvio(
  items: { tipo: "lote" | "producto"; precio: number; qty: number }[]
): number | null {
  if (items.some((it) => it.tipo === "lote")) return null; // coordinar WhatsApp
  const sub = items.reduce((s, it) => s + it.precio * it.qty, 0);
  if (sub <= 0) return 0;
  return sub >= ENVIO_AMAREA_GRATIS_DESDE ? 0 : ENVIO_AMAREA_TARIFA;
}

// Precio de referencia por pieza (el lote mas chico, 10 pzs = $115/pieza).
// Se usa para mostrar el ahorro por volumen en cada lote.
export const PPU_REFERENCIA = 115;

export type Lote = {
  id: string;
  tag: string;
  nombre: string;
  piezas: number;
  precio: number;
  tipo: "mixto" | "labiales" | "grande";
  popular: boolean;
  wppOnly: boolean;
  foto: string | null;
  desc: string;
  features: string[];
};

export const LOTES: Lote[] = [
  {
    id: "mixto-10",
    tag: "Lote Mixto - 10 piezas",
    nombre: "Lote de 10 Piezas",
    piezas: 10,
    precio: 1150,
    tipo: "mixto",
    popular: false,
    wppOnly: false,
    foto: BASE + "/lote-10-mixto.png",
    desc: "Lote mixto con marcas como e.l.f, NYX, Maybelline y más. Ideal para empezar.",
    features: [
      "10 piezas de marcas premium",
      "Marcas: e.l.f, NYX, Maybelline",
      "Surtido mixto variado",
      "Sin piezas repetidas",
      "Empaque seguro incluido",
    ],
  },
  {
    id: "mixto-15",
    tag: "Lote Mixto - 15 piezas",
    nombre: "Lote de 15 Piezas",
    piezas: 15,
    precio: 1650,
    tipo: "mixto",
    popular: false,
    wppOnly: false,
    foto: BASE + "/lote-15-mixto.png",
    desc: "Lote mixto con marcas premium. Gran variedad de categorías de tus marcas favoritas.",
    features: [
      "15 piezas de marcas premium",
      "Marcas: e.l.f, NYX, Maybelline, LOreal",
      "Variedad de categorias",
      "Sin piezas repetidas",
      "Empaque seguro incluido",
    ],
  },
  {
    id: "mixto-20",
    tag: "Lote Mixto - 20 piezas",
    nombre: "Lote de 20 Piezas",
    piezas: 20,
    precio: 2100,
    tipo: "mixto",
    popular: false,
    wppOnly: false,
    foto: BASE + "/lote-20-mixto.png",
    desc: "Lote mixto con gran variedad: labiales, bases, sombras, primers y más. De las mejores marcas de beauty.",
    features: [
      "20 piezas de marcas premium",
      "Surtido amplio de categorias",
      "Marcas premium",
      "Sin piezas repetidas",
      "Empaque seguro incluido",
    ],
  },
  {
    id: "mixto-25",
    tag: "Lote Mixto - 25 piezas",
    nombre: "Lote de 25 Piezas",
    piezas: 25,
    precio: 2600,
    tipo: "mixto",
    popular: false,
    wppOnly: false,
    foto: BASE + "/lote-25-mixto.png",
    desc: "Lote mixto para revendedoras. Marcas: e.l.f, NYX, Pixi, Starface, Maybelline y mas.",
    features: [
      "25 piezas de marcas premium",
      "Marcas: e.l.f, NYX, Pixi, Starface",
      "Variedad garantizada",
      "Sin piezas repetidas",
      "Empaque + lista de contenido",
    ],
  },
  {
    id: "mixto-30",
    tag: "Lote Mixto - 30 piezas",
    nombre: "Lote de 30 Piezas",
    piezas: 30,
    precio: 3000,
    tipo: "mixto",
    popular: false,
    wppOnly: false,
    foto: BASE + "/lote-30-mixto.png",
    desc: "Lote mixto completo: maquillaje, skincare y accesorios. Marcas premium que amas.",
    features: [
      "30 piezas de marcas premium",
      "Maquillaje + skincare + accesorios",
      "Marcas premium",
      "Sin piezas repetidas",
      "Empaque reforzado + lista",
    ],
  },
  {
    id: "mixto-50",
    tag: "El mas popular - 50 piezas",
    nombre: "Lote de 50 Piezas",
    piezas: 50,
    precio: 4850,
    tipo: "mixto",
    popular: true,
    wppOnly: false,
    foto: BASE + "/lote-50-mixto.png",
    desc: "Nuestro lote favorito. Gran variedad de marcas y categorias. El mejor precio por pieza.",
    features: [
      "50 piezas de marcas premium",
      "Gran variedad de marcas",
      "Incluye labiales, ojos, cutis y mas",
      "Sin piezas repetidas",
      "Empaque reforzado + lista detallada",
    ],
  },
  {
    id: "mixto-100",
    tag: "Lote Pro - 100 piezas",
    nombre: "Lote de 100 Piezas",
    piezas: 100,
    precio: 9300,
    tipo: "grande",
    popular: false,
    wppOnly: false,
    foto: BASE + "/lote-100-mixto.png",
    desc: "Para revendedoras serias. Maquillaje + skincare + accesorios. El mejor precio unitario.",
    features: [
      "100 piezas de marcas premium",
      "Maquillaje + skincare + accesorios",
      "Mayor variedad de marcas",
      "Lista detallada de contenido",
      "Empaque reforzado",
    ],
  },
  {
    id: "mixto-500",
    tag: "Mayorista - 500 piezas",
    nombre: "Lote de 500 Piezas",
    piezas: 500,
    precio: 43500,
    tipo: "grande",
    popular: false,
    wppOnly: true,
    foto: BASE + "/lote-500-mixto.jpg",
    desc: "Para distribuidoras. El precio por pieza mas bajo: $87 MXN. Solo por WhatsApp.",
    features: [
      "500 piezas de marcas premium",
      "Precio mas bajo: $87 MXN/pieza",
      "Coordinar envio especial",
      "Lista completa de contenido",
      "Atencion personalizada",
    ],
  },
  {
    id: "labiales-20",
    tag: "Especial Labiales - 20 pzs",
    nombre: "Lote de 20 Labiales",
    piezas: 20,
    precio: 1900,
    tipo: "labiales",
    popular: false,
    wppOnly: true,
    foto: BASE + "/lote-20-labiales.jpg",
    desc: "Lote especializado en labiales de marcas premium. Colores variados, mate y glossy. Solo por WhatsApp.",
    features: [
      "20 labiales de marcas premium",
      "Colores variados mate y glossy",
      "Marcas de importacion premium",
      "Sin colores repetidos",
      "Alta demanda en reventa",
    ],
  },
];

export function fmx(n: number): string {
  return "$" + Number(n).toLocaleString("es-MX");
}

// ---- Envío de LOTES (se cotiza con Skydropx según peso/medidas de la caja) ----
export type Paquete = { length: number; width: number; height: number; weight: number };

// Caja típica por lote (cm + kg). null = no aplica cotización automática
// (el lote de 500 pz pesa ~35 kg → flete especial, se coordina por WhatsApp).
export function parcelDeLote(piezas: number): Paquete | null {
  if (piezas <= 10) return { length: 25, width: 20, height: 10, weight: 0.9 };
  if (piezas <= 15) return { length: 30, width: 22, height: 12, weight: 1.2 };
  if (piezas <= 20) return { length: 30, width: 22, height: 12, weight: 1.6 };
  if (piezas <= 25) return { length: 30, width: 25, height: 15, weight: 2.0 };
  if (piezas <= 30) return { length: 30, width: 25, height: 15, weight: 2.3 };
  if (piezas <= 50) return { length: 35, width: 30, height: 20, weight: 3.7 };
  if (piezas <= 100) return { length: 40, width: 35, height: 30, weight: 7.2 };
  return null; // 500 pz → coordinar por WhatsApp
}

export function loteDeItemId(id: string): Lote | undefined {
  return id.startsWith("lote:") ? LOTES.find((l) => l.id === id.slice(5)) : undefined;
}

// Modo de envío del carrito:
//  - "amarea"    : solo productos → regla fija ($599 gratis / $99)
//  - "cotizar"   : tiene lotes → se cotiza con Skydropx según peso
//  - "coordinar" : tiene un lote sin cotización automática (500 pz) → WhatsApp
export function modoEnvio(
  items: { tipo: "lote" | "producto"; id: string }[]
): "amarea" | "cotizar" | "coordinar" {
  const lotes = items.filter((i) => i.tipo === "lote");
  if (lotes.length === 0) return "amarea";
  for (const it of lotes) {
    const l = loteDeItemId(it.id);
    if (!l || parcelDeLote(l.piezas) === null) return "coordinar";
  }
  return "cotizar";
}

// Construye la lista de cajas (parcels) para cotizar un carrito con lotes.
// Cada unidad de lote = una caja; los productos sueltos van en una caja default.
export function parcelsDeItems(
  items: { tipo: "lote" | "producto"; id: string; qty: number; piezas?: number }[]
): Paquete[] {
  const parcels: Paquete[] = [];
  let hayProducto = false;
  for (const it of items) {
    if (it.tipo === "lote") {
      const piezas = it.piezas ?? loteDeItemId(it.id)?.piezas ?? 0;
      const caja = parcelDeLote(piezas);
      if (caja) for (let i = 0; i < it.qty; i++) parcels.push(caja);
    } else {
      hayProducto = true;
    }
  }
  if (hayProducto) parcels.push({ length: 20, width: 15, height: 10, weight: 0.5 });
  return parcels;
}
