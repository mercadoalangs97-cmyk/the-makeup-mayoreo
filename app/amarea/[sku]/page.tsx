import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  fetchProductoPorSku,
  fetchProductosTienda,
  fetchFotosProducto,
  extrasFicha,
  variantesDe,
  nombreDisplay,
  tituloFicha,
  descripcionFicha,
} from "../../lib/productos";
import { SITE_URL, SITE_NAME } from "../../lib/site";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import FilaProductos from "../../components/FilaProductos";
import ProductoDetalle from "./ProductoDetalle";

// Ficha de producto: se cachea 60 s (es la página a la que llegan los anuncios).
export const revalidate = 60;

// Sin esto Next trata la ruta como dinámica y la vuelve a construir en CADA
// visita (revalidate se ignora). Con la lista vacía no se genera nada en el
// build: cada SKU se arma la primera vez que alguien lo abre y de ahí se cachea.
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

type Params = { params: Promise<{ sku: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { sku } = await params;
  const { producto } = await fetchProductoPorSku(decodeURIComponent(sku));
  if (!producto) return { title: "Producto no encontrado | AMARÉA" };

  const nombre = nombreDisplay(producto);
  // Título ≤60 y descripción 120-160 cortada en punto o espacio (nunca a mitad
  // de palabra). Ver tituloFicha/descripcionFicha en lib/productos.
  const titulo = tituloFicha(producto);
  const desc = descripcionFicha(producto);

  return {
    title: titulo,
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
      title: `${nombre} | AMARÉA`,
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

  // Galería: todas las fotos del producto (si tiene más de una en el bucket).
  const fotos = await fetchFotosProducto(producto.sku, producto.foto);

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
    gtin:
      producto.barcode && /^\d{8,14}$/.test(producto.barcode)
        ? producto.barcode
        : undefined,
    brand: { "@type": "Brand", name: producto.marcaNorm },
    category: producto.categoria ?? undefined,
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/amarea/${producto.sku}`,
      priceCurrency: "MXN",
      price: producto.precio_mxn ?? 0,
      itemCondition: "https://schema.org/NewCondition",
      availability:
        producto.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: SITE_NAME },
    },
  };

  // Migas (breadcrumb) para SEO
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Productos",
        item: `${SITE_URL}/amarea`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: nombre,
        item: `${SITE_URL}/amarea/${producto.sku}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <SiteHeader variant="amarea" />
      <ProductoDetalle producto={producto} variantes={variantes} fotos={fotos} />

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
