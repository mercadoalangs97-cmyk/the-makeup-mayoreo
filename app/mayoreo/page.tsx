import type { Metadata } from "next";
import { SITE_URL } from "../lib/site";
import { LOTES } from "../lib/lotes";
import MayoreoClient from "./MayoreoClient";

export const metadata: Metadata = {
  // ≤60 caracteres: la palabra que se busca ("lotes de maquillaje al mayoreo")
  // va al principio, que es lo que sobrevive al corte del buscador.
  title: "Lotes de maquillaje al mayoreo · The Makeup CDMX",
  description:
    "Lotes de maquillaje de las mejores marcas de beauty: e.l.f, NYX, Maybelline, L'Oréal y más. Paquetes de 10 a 500 piezas. Para revendedoras en México.",
  keywords: [
    "lotes maquillaje",
    "maquillaje mayoreo",
    "marcas de maquillaje",
    "revendedoras Mexico",
    "e.l.f",
    "NYX",
    "Maybelline",
    "CDMX",
  ],
  alternates: { canonical: `${SITE_URL}/mayoreo` },
};

// Cada lote es un producto con su precio. Sin esto, la página que más vende
// era la única sin datos de producto: la competencia sale en Google con su
// precio a la vista y nosotros no. Los precios se toman de LOTES, la misma
// fuente que pinta la página, para que nunca se separen (regla anti
// "price mismatch" de Merchant).
function schemaLotes() {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Lotes de maquillaje al mayoreo",
    description:
      "Lotes surtidos de maquillaje original de e.l.f, NYX, Maybelline, L'Oréal y Pixi para revendedoras en México.",
    numberOfItems: LOTES.length,
    itemListElement: LOTES.map((l, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Product",
        name: l.nombre,
        description: l.desc,
        image: l.foto ? [l.foto] : undefined,
        category: "Maquillaje al mayoreo",
        url: `${SITE_URL}/mayoreo#lotes`,
        offers: {
          "@type": "Offer",
          priceCurrency: "MXN",
          price: l.precio,
          itemCondition: "https://schema.org/NewCondition",
          availability: "https://schema.org/InStock",
          seller: { "@type": "Organization", name: "The Makeup Mayoreo CDMX" },
        },
        additionalProperty: [
          {
            "@type": "PropertyValue",
            name: "Piezas incluidas",
            value: l.piezas,
          },
          {
            "@type": "PropertyValue",
            name: "Precio por pieza",
            value: Math.round(l.precio / l.piezas),
          },
        ],
      },
    })),
  };
}

export default function MayoreoPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaLotes()) }}
      />
      <MayoreoClient />
    </>
  );
}
