import { fetchProductosTienda, nombreDisplay } from "../lib/productos";
import { SITE_URL, SITE_NAME } from "../lib/site";
import { imgOpt } from "../lib/img";

// Feed de productos para Google Merchant Center (Shopping + fichas gratuitas) y
// compatible con el catálogo de Meta. Se sirve en /feed.xml
export const dynamic = "force-dynamic";
export const revalidate = 0;

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// GTIN válido = EAN-8 (8), UPC-A (12), EAN-13 (13) o ITF-14 (14) dígitos.
function gtinValido(bc: string): boolean {
  return /^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(bc);
}

export async function GET() {
  const { productos } = await fetchProductosTienda();

  const items = productos
    .filter((p) => p.foto && p.precio_mxn)
    .map((p) => {
      const nombre = nombreDisplay(p);
      const url = `${SITE_URL}/amarea/${p.sku}`;
      const img = imgOpt(p.foto, 800) ?? p.foto;
      const desc = (
        p.notas?.trim() ||
        `${nombre} de ${p.marcaNorm}. Maquillaje 100% original por pieza, con envío a todo México y pago seguro.`
      ).slice(0, 400);
      const bc = String(p.barcode || "").trim();
      const tieneGtin = gtinValido(bc);
      const title = `${nombre} · ${p.marcaNorm}`.slice(0, 140);

      return `  <item>
    <g:id>${esc(p.sku)}</g:id>
    <g:title>${esc(title)}</g:title>
    <g:description>${esc(desc)}</g:description>
    <g:link>${esc(url)}</g:link>
    <g:image_link>${esc(img)}</g:image_link>
    <g:availability>${p.stock > 0 ? "in_stock" : "out_of_stock"}</g:availability>
    <g:price>${(p.precio_mxn || 0).toFixed(2)} MXN</g:price>
    <g:brand>${esc(p.marcaNorm)}</g:brand>
    <g:condition>new</g:condition>
    <g:mpn>${esc(p.sku)}</g:mpn>
${tieneGtin ? `    <g:gtin>${esc(bc)}</g:gtin>\n` : ""}    <g:identifier_exists>${tieneGtin ? "yes" : "no"}</g:identifier_exists>
    <g:google_product_category>Health &amp; Beauty &gt; Personal Care &gt; Cosmetics &gt; Makeup</g:google_product_category>
    <g:product_type>${esc(p.categoria || "Maquillaje")}</g:product_type>
  </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
  <title>${esc(SITE_NAME)} · AMARÉA — Maquillaje por pieza</title>
  <link>${SITE_URL}</link>
  <description>Catálogo de maquillaje original por pieza: e.l.f, NYX, Maybelline, L'Oréal y más.</description>
${items}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
