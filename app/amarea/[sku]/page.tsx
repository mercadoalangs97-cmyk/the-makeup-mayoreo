import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  fetchProductoPorSku,
  fetchProductosTienda,
  extrasFicha,
  variantesDe,
  nombreDisplay,
} from "../../lib/productos";
import { SITE_URL, SITE_NAME } from "../../lib/site";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import FilaProductos from "../../components/FilaProductos";
import ProductoDetalle from "./ProductoDetalle";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ sku: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { sku } = await params;
  const { producto } = await fetchProductoPorSku(decodeURIComponent(sku));
  if (!producto) return { title: "Producto no encontrado | AMAREA" };

  const nombre = nombreDisplay(producto);
  const desc =
    (producto.notas && producto.notas.trim()
      ? producto.notas.trim()
      : `${nombre} de ${producto.marcaNorm}. Cómpralo por pieza con envío a todo México.`
    ).slice(0, 160);

  return {
    title: `${nombre} | AMAREA`,
    description: desc,
    keywords: [
      nombre,
      producto.marcaNorm,
      producto.categoria ?? "maquillaje",
      "comprar " + (producto.categoria ?? "maquillaje") + " México",
      producto.marcaNorm + " México",
    ],
    alternates: { canonical: `${SITE_URL}/amarea/${producto.sku}` },
    openGraph: {
      title: `${nombre} | AMAREA`,
      description: desc,
      type: "website",
      images: producto.foto ? [{ url: producto.foto }] : undefined,
    },
  };
}

export default async function ProductoPage({ params }: Params) {
  const { sku } = await params;
  const { producto } = await fetchProductoPorSku(decodeURIComponent(sku));
  if (!producto) notFound();

  // Pool para variantes / relacionados / completa tu look
  const { productos: pool } = await fetchProductosTienda();
  const variantes = variantesDe(pool, producto);
  const { relacionados, completaTuLook } = extrasFicha(pool, producto);

  const nombre = nombreDisplay(producto);

  // Structured data schema.org Producto (rich results en Google)
  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: nombre,
    image: producto.foto ? [producto.foto] : undefined,
    description:
      producto.notas?.trim() ||
      `${nombre} de ${producto.marcaNorm}, disponible por pieza.`,
    sku: producto.sku,
    brand: { "@type": "Brand", name: producto.marcaNorm },
    category: producto.categoria ?? undefined,
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/amarea/${producto.sku}`,
      priceCurrency: "MXN",
      price: producto.precio_mxn ?? 0,
      availability:
        producto.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: SITE_NAME },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteHeader variant="amarea" />
      <ProductoDetalle producto={producto} variantes={variantes} />

      <div className="pd-extras">
        <FilaProductos
          titulo="Completa tu look"
          subtitulo="Lo que mejor combina con este producto"
          productos={completaTuLook}
        />
        <FilaProductos
          titulo="Productos relacionados"
          subtitulo="Más de lo que estás buscando"
          productos={relacionados}
        />
      </div>

      <SiteFooter />
    </>
  );
}
