import type { Metadata } from "next";
import { SITE_URL } from "../lib/site";
import { LOTES } from "../lib/lotes";
import { imgOpt } from "../lib/img";
import { createAdminSupabase } from "../lib/supabase";
import { lotesAgotados } from "../lib/disponibilidad";
import MayoreoClient, {
  type OpinionPublica,
  type LoteEspecial,
} from "./MayoreoClient";

// Se refresca cada 10 min: al marcar una opinión como publicada en el panel,
// aparece sola en el sitio sin volver a desplegar.
// 2 min: cuando se marca un lote como agotado desde el panel, la web lo
// refleja casi al momento sin dejar de estar cacheada.
export const revalidate = 120;

// Solo opiniones REALES: autorizadas por la clienta y marcadas como publicadas
// a mano desde el panel. Si no hay ninguna, la sección no existe.
async function opinionesPublicadas(): Promise<OpinionPublica[]> {
  try {
    const sb = createAdminSupabase();
    const { data } = await sb
      .from("opiniones")
      .select("id,nombre,ciudad,calificacion,texto")
      .eq("publicada", true)
      .eq("autoriza", true)
      .order("creada_en", { ascending: false })
      .limit(9);
    return (data || []) as OpinionPublica[];
  } catch {
    return [];
  }
}

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
        image: l.foto ? [imgOpt(l.foto, 800, 72) ?? l.foto] : undefined,
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

// Lotes personalizados que la dueña marcó como publicados en el panel.
// Se venden por WhatsApp → link de pago (no por carrito): así toda venta de
// estos pasa por el cotizador, que valida precios y mide el embudo.
async function lotesEspecialesPublicados(): Promise<LoteEspecial[]> {
  try {
    const sb = createAdminSupabase();
    const { data } = await sb
      .from("lotes_personalizados")
      .select("id,nombre,piezas,precio,descripcion,foto")
      .eq("publicado", true)
      .order("veces_usado", { ascending: false })
      .limit(8);
    return (data || []) as LoteEspecial[];
  } catch {
    return [];
  }
}

export default async function MayoreoPage() {
  const opiniones = await opinionesPublicadas();
  const especiales = await lotesEspecialesPublicados();
  // Lotes que la duena marco como agotados desde el panel.
  const agotados = await lotesAgotados();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaLotes()) }}
      />
      <MayoreoClient opiniones={opiniones} especiales={especiales} agotados={agotados} />
    </>
  );
}
