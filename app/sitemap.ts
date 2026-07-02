import type { MetadataRoute } from "next";
import { SITE_URL } from "./lib/site";
import { fetchProductosTienda } from "./lib/productos";

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
    // Home = tienda AMAREA (producto por pieza). Cambia seguido (stock).
    { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1 },
    // Mayoreo: página aparte, sigue indexada para quien busca "lotes de maquillaje".
    {
      url: `${SITE_URL}/mayoreo`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...fichas,
  ];
}
