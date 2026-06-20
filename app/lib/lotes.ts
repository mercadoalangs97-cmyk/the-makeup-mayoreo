// Datos de los lotes.
// NOTA: por ahora estan aqui en codigo (igual que en el index.html original).
// En una fase posterior esto se leera de la tabla `lotes_tienda` de Supabase.

export const BASE =
  "https://yekvehkmgunoafccwmyp.supabase.co/storage/v1/object/public/lotes-fotos";
export const WPP = "5215543813568";

// Umbral de envio gratis (MXN) — usado en hero, barra y carrito.
export const ENVIO_GRATIS_DESDE = 2500;

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
    foto: null,
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
    foto: null,
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
