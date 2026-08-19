// ============================================================================
//  IMÁGENES
// ============================================================================
// Las fotos originales del bucket pesan ~1 MB. Servirlas tal cual es inviable:
// una visita al catálogo con 40 productos serían 39 MB, y los 5 GB mensuales
// se acabarían en 130 visitas.
//
// Hay dos formas de servirlas ligeras:
//
//  1. VARIANTES PRE-GENERADAS (lo que usamos): copias en WebP ya guardadas en
//     el bucket, en `opt/<nombre>-w<ancho>.webp`. Son archivos normales, así
//     que NO dependen de ninguna función de pago de Supabase. Generadas a
//     calidad 88-90: se ven igual que el original y pesan ~60x menos.
//
//  2. Transformación en vivo (`/render/image/`), que Supabase lista como
//     "Storage Image Transformations · Unavailable in plan" en el plan Free.
//     Hoy funciona, pero si la cortan se romperían TODAS las fotos del sitio
//     y del panel a la vez. Por eso quedó solo como respaldo, para fotos que
//     todavía no tengan su variante.
//
// Anchos disponibles (los genera scripts/optimizar-fotos.mjs y también la app
// de inventario al subir una foto nueva).
const ANCHOS = [420, 800, 1200] as const;

/** El ancho generado más chico que aún cubre lo que se pide. */
function anchoVariante(width: number): number {
  return ANCHOS.find((a) => a >= width) ?? ANCHOS[ANCHOS.length - 1];
}

/**
 * URL de la variante optimizada de una foto del bucket.
 * `product-photos/EL-016-1.png` → `product-photos/opt/EL-016-1-w800.webp`
 */
export function urlVariante(url: string, width: number): string | null {
  const marca = "/storage/v1/object/public/";
  const i = url.indexOf(marca);
  if (i < 0) return null;
  const inicio = url.slice(0, i + marca.length);
  const resto = url.slice(i + marca.length).split("?")[0];
  const barra = resto.indexOf("/");
  if (barra < 0) return null;
  const bucket = resto.slice(0, barra);
  const ruta = resto.slice(barra + 1);
  if (ruta.startsWith("opt/")) return url; // ya es una variante
  const m = ruta.match(/^(.*)\.(png|jpe?g|webp)$/i);
  if (!m) return null;
  return `${inicio}${bucket}/opt/${m[1]}-w${anchoVariante(width)}.webp`;
}

/**
 * Devuelve la URL ligera de una imagen del Storage.
 * Si no es del Storage (o no se puede derivar la variante), la deja igual.
 */
export function imgOpt(
  url: string | null | undefined,
  width: number,
  // Se conserva por compatibilidad: solo aplica al respaldo en vivo, porque
  // las variantes ya vienen generadas con su calidad.
  quality = 62
): string | undefined {
  if (!url) return undefined;
  if (!url.includes("/storage/v1/object/public/")) return url;
  const variante = urlVariante(url, width);
  if (variante) return variante;
  return imgOptEnVivo(url, width, quality);
}

/** Respaldo: transformación en vivo de Supabase (función de pago). */
export function imgOptEnVivo(
  url: string,
  width: number,
  quality = 62
): string {
  const base = url.replace(
    "/storage/v1/object/public/",
    "/storage/v1/render/image/public/"
  );
  const sep = base.includes("?") ? "&" : "?";
  // resize=contain es CLAVE: sin él, Supabase deja el alto original y deforma
  // la imagen (ej. 420x1254 en vez de 420x420).
  return `${base}${sep}width=${width}&quality=${quality}&resize=contain`;
}
