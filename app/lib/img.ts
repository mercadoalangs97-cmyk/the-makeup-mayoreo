// Sirve imágenes de Supabase Storage redimensionadas y optimizadas (el navegador
// recibe WebP automáticamente). NO altera los archivos originales del bucket:
// solo cambia la URL de /object/public/ a /render/image/public/ con un ancho y
// calidad. Si la URL no es de nuestro Storage, la devuelve igual.
export function imgOpt(
  url: string | null | undefined,
  width: number,
  quality = 62
): string | undefined {
  if (!url) return undefined;
  if (!url.includes("/storage/v1/object/public/")) return url;
  const base = url.replace(
    "/storage/v1/object/public/",
    "/storage/v1/render/image/public/"
  );
  const sep = base.includes("?") ? "&" : "?";
  // resize=contain es CLAVE: sin él, Supabase deja el alto original y deforma la
  // imagen (ej. 420x1254 en vez de 420x420). Con contain escala proporcional.
  return `${base}${sep}width=${width}&quality=${quality}&resize=contain`;
}
