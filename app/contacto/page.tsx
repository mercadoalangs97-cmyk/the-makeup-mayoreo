import type { Metadata } from "next";
import { SITE_URL } from "../lib/site";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

export const metadata: Metadata = {
  title: "Contacto · The Makeup CDMX",
  description:
    "Contáctanos: WhatsApp y correo de The Makeup / AMAREA. Atención a consumidoras y revendedoras en todo México.",
  alternates: { canonical: `${SITE_URL}/contacto` },
};

export default function Contacto() {
  return (
    <>
      <SiteHeader variant="landing" />
      <main className="legal-page">
        <h1 className="serif">Contacto</h1>
        <p className="legal-updated">Estamos para ayudarte</p>

        <p>
          ¿Tienes dudas sobre un producto, tu pedido o el mayoreo? Escríbenos y
          con gusto te atendemos.
        </p>

        <h2>WhatsApp</h2>
        <p>
          <a
            href="https://wa.me/5215543813568"
            target="_blank"
            rel="noreferrer"
          >
            +52 55 4381 3568
          </a>{" "}
          — la forma más rápida de contactarnos.
        </p>

        <h2>Correo</h2>
        <p>
          <a href="mailto:ventas@themakeup.com.mx">ventas@themakeup.com.mx</a>
        </p>

        <h2>Negocio</h2>
        <p>
          The Makeup · AMAREA
          <br />
          Ciudad de México, México
          <br />
          Maquillaje original por pieza y al mayoreo · Envíos a todo México.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
