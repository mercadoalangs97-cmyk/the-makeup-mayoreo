import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "../lib/site";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

export const metadata: Metadata = {
  title: "Cambios y devoluciones · The Makeup CDMX",
  description:
    "Política de cambios y devoluciones de The Makeup / AMAREA. Por higiene los cosméticos no admiten devolución; resolvemos productos dañados, defectuosos o equivocados.",
  alternates: { canonical: `${SITE_URL}/devoluciones` },
};

export default function Devoluciones() {
  return (
    <>
      <SiteHeader variant="landing" />
      <main className="legal-page">
        <h1 className="serif">Cambios y devoluciones</h1>
        <p className="legal-updated">Última actualización: julio 2026</p>

        <h2>Por higiene, no hay cambios ni devoluciones</h2>
        <p>
          Por tratarse de productos de <strong>maquillaje y cosméticos</strong>,
          y por normas de <strong>higiene y seguridad</strong>,{" "}
          <strong>no aceptamos cambios ni devoluciones</strong> una vez que el
          producto fue entregado. Un cosmético que ya salió de nuestras manos no
          puede revenderse.
        </p>
        <p>
          Esto aplica a solicitudes por cambio de opinión, por el tono elegido, o
          por productos ya abiertos o usados.
        </p>

        <h2>Sí resolvemos si algo salió mal</h2>
        <p>Tu satisfacción nos importa. Si tu pedido llega:</p>
        <ul>
          <li>
            <strong>Dañado</strong> (roto, derramado)
          </li>
          <li>
            Con un <strong>defecto de fábrica</strong>
          </li>
          <li>
            <strong>Equivocado</strong> (distinto al que ordenaste)
          </li>
        </ul>
        <p>
          Escríbenos dentro de las <strong>72 horas</strong> siguientes a
          recibirlo, con <strong>fotos del producto y del empaque</strong> y tu{" "}
          <strong>número de pedido</strong>. Lo revisamos y te damos una
          solución: reposición del mismo producto o una alternativa.
        </p>

        <h2>Cómo reportarlo</h2>
        <p>
          WhatsApp:{" "}
          <a
            href="https://wa.me/5215543813568"
            target="_blank"
            rel="noreferrer"
          >
            +52 55 4381 3568
          </a>
          <br />
          Correo:{" "}
          <a href="mailto:ventas@themakeup.com.mx">ventas@themakeup.com.mx</a>
        </p>
        <p className="legal-note">
          Los reportes fuera del plazo de 72 horas, o de productos abiertos o
          usados por decisión de la clienta, no aplican para reposición.
        </p>

        <p style={{ marginTop: 28 }}>
          <Link href="/terminos">
            Ver también nuestros Términos y condiciones →
          </Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
