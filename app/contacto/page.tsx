import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL, NEGOCIO, NEGOCIO_DIR } from "../lib/site";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import WppLink from "../components/WppLink";

export const metadata: Metadata = {
  title: "Contacto · The Makeup CDMX",
  description:
    "Contáctanos: WhatsApp y correo de The Makeup / AMARÉA. Atención a consumidoras y revendedoras en todo México.",
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
          <WppLink href="https://wa.me/5215543813568" fuente="whatsapp_contacto">
            +52 55 4381 3568
          </WppLink>{" "}
          — la forma más rápida de contactarnos.
        </p>

        <h2>Correo</h2>
        <p>
          <a href="mailto:ventas@themakeup.com.mx">ventas@themakeup.com.mx</a>
        </p>

        <h2>Horario de atención</h2>
        <p>
          Lunes a viernes, de <strong>9:00 a 18:00 h</strong> (hora de la Ciudad
          de México). Los mensajes recibidos fuera de este horario los
          respondemos el siguiente día hábil.
        </p>

        <h2>Domicilio del negocio</h2>
        <p>
          {NEGOCIO.nombre}
          <br />
          {NEGOCIO_DIR}
          <br />
          Maquillaje original por pieza y al mayoreo · Envíos a todo México.
        </p>

        <h2>Privacidad</h2>
        <p>
          Consulta cómo cuidamos tus datos en nuestro{" "}
          <Link href="/privacidad">Aviso de Privacidad</Link>.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
