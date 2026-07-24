import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL, NEGOCIO, NEGOCIO_DIR } from "../lib/site";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

export const metadata: Metadata = {
  title: "Quiénes somos · The Makeup / AMARÉA",
  description:
    "Conoce a AMARÉA (The Makeup): tienda mexicana de maquillaje 100% original de marcas importadas, por pieza y al mayoreo, con envío a todo México.",
  alternates: { canonical: `${SITE_URL}/nosotros` },
};

export default function Nosotros() {
  return (
    <>
      <SiteHeader variant="landing" />
      <main className="legal-page">
        <h1 className="serif">Quiénes somos</h1>
        <p className="legal-updated">The Makeup · AMARÉA</p>

        <p>
          <strong>AMARÉA</strong> es la tienda en línea de{" "}
          <strong>The Makeup</strong>, un negocio mexicano dedicado a acercarte
          maquillaje <strong>100% original</strong> de las mejores marcas
          importadas —e.l.f, NYX, Maybelline, L&apos;Oréal, Pixi, Starface y
          más— a precios accesibles.
        </p>

        <h2>Qué hacemos</h2>
        <p>
          Vendemos maquillaje de dos formas: <strong>por pieza</strong> para
          consumidoras, y en <strong>lotes al mayoreo</strong> (de 10 a 500
          piezas) para revendedoras que quieren empezar o hacer crecer su
          negocio. Enviamos a <strong>toda la República Mexicana</strong>.
        </p>

        <h2>Nuestro compromiso</h2>
        <ul className="legal-list">
          <li>
            <strong>Productos 100% originales:</strong> nunca vendemos
            imitaciones.
          </li>
          <li>
            <strong>Pago seguro:</strong> procesamos tus pagos con Mercado Pago
            (tarjeta, SPEI y OXXO).
          </li>
          <li>
            <strong>Envíos con rastreo:</strong> empaque protegido y número de
            guía para que sigas tu pedido.
          </li>
          <li>
            <strong>Atención cercana:</strong> te respondemos por WhatsApp y
            correo en horario de oficina.
          </li>
        </ul>

        <h2>Dónde estamos</h2>
        <p>
          Operamos desde {NEGOCIO.ciudad}, {NEGOCIO.estado}, y enviamos a todo
          México.
          <br />
          <strong>Domicilio:</strong> {NEGOCIO_DIR}
        </p>

        <h2>Contáctanos</h2>
        <p>
          WhatsApp:{" "}
          <a
            href={`https://wa.me/${NEGOCIO.whatsapp}`}
            target="_blank"
            rel="noreferrer"
          >
            {NEGOCIO.telefono}
          </a>
          <br />
          Correo: <a href={`mailto:${NEGOCIO.email}`}>{NEGOCIO.email}</a>
        </p>

        <p style={{ marginTop: 28 }}>
          <Link href="/amarea" className="guia-cta">
            Ver la tienda →
          </Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
