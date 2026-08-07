import type { Metadata } from "next";
import { SITE_URL, NEGOCIO, NEGOCIO_DIR } from "../lib/site";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

export const metadata: Metadata = {
  title: "Aviso de Privacidad · The Makeup / AMARÉA",
  description:
    "Aviso de Privacidad de The Makeup / AMARÉA: qué datos recabamos, para qué los usamos, con quién los compartimos y cómo ejercer tus derechos ARCO.",
  alternates: { canonical: `${SITE_URL}/privacidad` },
};

export default function Privacidad() {
  return (
    <>
      <SiteHeader variant="landing" />
      <main className="legal-page">
        <h1 className="serif">Aviso de Privacidad</h1>
        <p className="legal-updated">Última actualización: julio 2026</p>

        <p>
          En <strong>{NEGOCIO.nombre}</strong> respetamos y protegemos tus datos
          personales. Este Aviso de Privacidad describe qué información
          recabamos, con qué fines la usamos y cómo puedes ejercer tus derechos.
        </p>

        <h2>Responsable de tus datos</h2>
        <p>
          {NEGOCIO.nombre}, con domicilio en {NEGOCIO_DIR}, es responsable del
          tratamiento de tus datos personales. Puedes contactarnos en{" "}
          <a href={`mailto:${NEGOCIO.email}`}>{NEGOCIO.email}</a> o por WhatsApp
          al {NEGOCIO.telefono}.
        </p>

        <h2>Datos que recabamos</h2>
        <ul className="legal-list">
          <li>
            <strong>Identificación y contacto:</strong> nombre, correo
            electrónico y teléfono/WhatsApp.
          </li>
          <li>
            <strong>Datos de envío:</strong> domicilio, colonia, código postal,
            ciudad y estado, y referencias de entrega.
          </li>
          <li>
            <strong>Datos de pago:</strong> se procesan directamente por nuestra
            plataforma de pagos (Mercado Pago). <strong>No almacenamos</strong>{" "}
            los datos completos de tu tarjeta.
          </li>
          <li>
            <strong>Datos de navegación:</strong> información anónima de uso del
            sitio (por ejemplo, con Google Analytics) para mejorar tu
            experiencia.
          </li>
        </ul>

        <h2>Para qué usamos tus datos</h2>
        <ul className="legal-list">
          <li>Procesar, preparar y enviar tus pedidos.</li>
          <li>Darte atención y responder tus dudas o aclaraciones.</li>
          <li>Emitir tu factura, si la solicitas.</li>
          <li>
            Con tu consentimiento, enviarte novedades y promociones (puedes darte
            de baja cuando quieras).
          </li>
        </ul>

        <h2>Con quién compartimos datos</h2>
        <p>
          Solo compartimos lo necesario para operar tu compra, con proveedores
          que nos ayudan a brindarte el servicio:
        </p>
        <ul className="legal-list">
          <li>
            <strong>Mercado Pago</strong> — para procesar tus pagos de forma
            segura.
          </li>
          <li>
            <strong>Paqueterías</strong> (por ejemplo Estafeta, vía Skydropx) —
            para entregarte tu pedido.
          </li>
          <li>
            <strong>Proveedores de correo y alojamiento</strong> — para enviarte
            confirmaciones y operar el sitio.
          </li>
        </ul>
        <p>
          No vendemos ni rentamos tus datos personales a terceros con fines
          comerciales.
        </p>

        <h2>Tus derechos (ARCO)</h2>
        <p>
          Tienes derecho a <strong>Acceder</strong>, <strong>Rectificar</strong>,{" "}
          <strong>Cancelar</strong> u <strong>Oponerte</strong> al uso de tus
          datos, así como a revocar tu consentimiento. Para ejercerlos, escríbenos
          a <a href={`mailto:${NEGOCIO.email}`}>{NEGOCIO.email}</a> indicando tu
          solicitud; te responderemos en un plazo razonable.
        </p>

        <h2>Datos sensibles</h2>
        <p>
          No recabamos datos personales sensibles (como origen étnico, estado de
          salud, creencias, etc.).
        </p>

        <h2>Cambios a este aviso</h2>
        <p>
          Podemos actualizar este Aviso de Privacidad. Cualquier cambio se
          publicará en esta misma página con su fecha de actualización.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
