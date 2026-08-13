import type { MetadataRoute } from "next";
import { SITE_URL } from "./lib/site";
import { fetchProductosTienda } from "./lib/productos";
import { GUIAS } from "./lib/guias";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  let productos: { sku: string }[] = [];
  try {
    const res = await fetchProductosTienda();
    productos = res.productos;
  } catch {
    productos = [];
  }

  const fichas: MetadataRoute.Sitemap = productos.map((p) => ({
    url: `${SITE_URL}/amarea/${p.sku}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [
    // Home informativa (contenido SEO + destacados).
    { url: SITE_URL, lastModified: now, changeFrequency: "weekly", priority: 1 },
    // Catálogo completo AMARÉA (todos los productos por pieza). Cambia seguido.
    {
      url: `${SITE_URL}/amarea`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    // Mayoreo: página aparte, indexada para "lotes de maquillaje".
    {
      url: `${SITE_URL}/mayoreo`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    // Página de intención "busco proveedor" (distinta a "quiero comprar lote").
    {
      url: `${SITE_URL}/proveedor-maquillaje`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    // Guías (blog) — SEO + GEO.
    { url: `${SITE_URL}/guias`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    ...GUIAS.map((g) => ({
      url: `${SITE_URL}/guias/${g.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    // Páginas de información (Merchant Center / confianza).
    { url: `${SITE_URL}/nosotros`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE_URL}/rastreo`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/contacto`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/devoluciones`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terminos`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/privacidad`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    ...fichas,
  ];
}
