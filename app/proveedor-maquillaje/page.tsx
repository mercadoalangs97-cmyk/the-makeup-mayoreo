import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import WppLink from "../components/WppLink";
import { LOTES, WPP, fmx, PPU_REFERENCIA } from "../lib/lotes";
import { SITE_URL } from "../lib/site";

// "proveedor de maquillaje" convierte a $32.91 por contacto en Google Ads —
// de las más baratas de la cuenta— y no tenía página propia: los anuncios
// caían en /mayoreo, que responde a otra intención ("quiero comprar un lote"
// vs "busco un proveedor confiable"). Esta página responde la segunda.
export const metadata: Metadata = {
  title: "Proveedor de maquillaje original en México",
  description:
    // 156 caracteres — el tope sano es 160 (ver TOPE_TITULO/MAX_DESC en lib/productos).
    "Proveedor directo de maquillaje original: e.l.f, NYX, Maybelline, L'Oréal y Pixi. Lotes desde 10 piezas, precios por pieza a la vista y envío a todo México.",
  keywords: [
    "proveedor de maquillaje",
    "proveedores de maquillaje original",
    "distribuidora de maquillaje",
    "proveedor maquillaje mexico",
    "mayorista de cosmeticos",
  ],
  alternates: { canonical: `${SITE_URL}/proveedor-maquillaje` },
};

export const revalidate = 3600;

const MARCAS = [
  "e.l.f Cosmetics",
  "NYX Professional Makeup",
  "Maybelline New York",
  "L'Oréal Paris",
  "Pixi",
  "Starface",
];

const CRITERIOS = [
  {
    t: "Que te diga qué marcas maneja",
    d: "Un proveedor serio nombra las marcas. Si solo dice “maquillaje de importación” sin decir cuáles, no sabes qué vas a revender ni a cuánto se vende.",
  },
  {
    t: "Que publique sus precios",
    d: "Si tienes que pedir la lista por WhatsApp y esperar, no puedes comparar ni sacar tus números. Los nuestros están en esta misma página.",
  },
  {
    t: "Que te deje empezar chico",
    d: "Pedir compras mínimas de miles de pesos a alguien que apenas arranca es la forma más rápida de que se quede con producto parado.",
  },
  {
    t: "Que puedas pagar de forma protegida",
    d: "Pagar con Mercado Pago o tarjeta te deja con quién reclamar. Una transferencia a una cuenta personal, no.",
  },
  {
    t: "Que te dé número de guía",
    d: "Sin rastreo no sabes si tu pedido existe. Cada envío nuestro sale con guía de Estafeta y puedes seguirlo en el sitio.",
  },
];

export default function ProveedorMaquillaje() {
  const mixtos = LOTES.filter((l) => l.id.startsWith("mixto-")).sort(
    (a, b) => a.piezas - b.piezas
  );
  const chico = mixtos[0];
  const grande = mixtos[mixtos.length - 1];

  return (
    <>
      <SiteHeader variant="mayoreo" />
      <main className="prov-main">
        <header className="prov-hero">
          <span className="prov-eyebrow">Proveedor directo</span>
          <h1 className="serif prov-h1">
            Proveedor de maquillaje original en México
          </h1>
          {/* Respuesta directa arriba: es lo que se cita y lo que la clienta
              vino a saber. Nada de párrafo de bienvenida. */}
          <p className="prov-lead">
            Importamos y vendemos <b>maquillaje 100% original</b> de{" "}
            {MARCAS.slice(0, 4).join(", ")} y {MARCAS[4]}, en{" "}
            <b>lotes surtidos desde {chico.piezas} piezas</b> (
            {fmx(chico.precio)}) hasta {grande.piezas} piezas (
            {fmx(grande.precio)}). Precio por pieza de{" "}
            <b>
              ${Math.round(grande.precio / grande.piezas)} a $
              {Math.round(chico.precio / chico.piezas)}
            </b>{" "}
            según el volumen. Envío por Estafeta a toda la República y pago con
            Mercado Pago, tarjeta, transferencia u OXXO.
          </p>
          <div className="prov-cta">
            <Link className="btn-primary" href="/mayoreo#precios">
              Ver precios por pieza
            </Link>
            <WppLink
              fuente="proveedor_pagina"
              href={`https://wa.me/${WPP}?text=${encodeURIComponent(
                "Hola! Busco un proveedor de maquillaje original, ¿me pueden dar informes?"
              )}`}
              className="btn-outline"
            >
              Preguntar por WhatsApp
            </WppLink>
          </div>
        </header>

        <section className="prov-sec">
          <h2 className="serif">Qué marcas manejamos</h2>
          <ul className="prov-marcas">
            {MARCAS.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
          <p className="prov-p">
            Son marcas de farmacia y tienda departamental, no marcas genéricas.
            Eso importa para ti: son las que tus clientas ya conocen y buscan por
            nombre, así que no tienes que explicar qué son para venderlas.
          </p>
        </section>

        <section className="prov-sec">
          <h2 className="serif">Cómo elegir proveedor (aunque no seamos nosotros)</h2>
          <p className="prov-p">
            Cinco cosas que conviene revisar antes de mandarle dinero a
            cualquiera, incluidos nosotros:
          </p>
          <ol className="prov-lista">
            {CRITERIOS.map((c) => (
              <li key={c.t}>
                <b>{c.t}.</b> {c.d}
              </li>
            ))}
          </ol>
        </section>

        <section className="prov-sec">
          <h2 className="serif">Cuánto necesitas para empezar</h2>
          <p className="prov-p">
            El lote más chico son <b>{chico.piezas} piezas por {fmx(chico.precio)}</b>{" "}
            más envío. Tomando {fmx(PPU_REFERENCIA)} por pieza —el precio
            promedio al que se vende esta clase de producto en tienda— ese lote
            se vende en {fmx(PPU_REFERENCIA * chico.piezas)}.
          </p>
          <p className="prov-nota">
            Es una estimación, no una promesa: tu ganancia real depende del
            precio al que vendas, de tu mercado y de qué tan rápido rotes el
            producto.
          </p>
          <div className="prov-cta">
            <Link className="btn-primary" href="/mayoreo">
              Ver todos los lotes
            </Link>
            <Link className="btn-outline" href="/guias/como-vender-maquillaje-al-mayoreo">
              Guía para empezar a revender
            </Link>
          </div>
        </section>

        <section className="prov-sec">
          <h2 className="serif">Quiénes somos</h2>
          <p className="prov-p">
            The Makeup / AMARÉA es un negocio mexicano con domicilio en el Estado
            de México. Vendemos en línea a toda la República, facturamos y cada
            pedido sale con número de guía rastreable.{" "}
            <Link href="/nosotros">Conoce más de nosotros</Link> o revisa
            nuestra <Link href="/devoluciones">política de cambios</Link>.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
