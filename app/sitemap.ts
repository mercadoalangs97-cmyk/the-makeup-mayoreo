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
    url: `${SITE_URL}/shop/${p.sku}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [
    { url: SITE_URL, lastModified: now, changeFrequency: "weekly", priority: 1 },
    {
      url: `${SITE_URL}/shop`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...fichas,
  ];
}
