import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL, SITE_NAME } from "../lib/site";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

export const metadata: Metadata = {
  title: "Términos y condiciones · The Makeup CDMX",
  description:
    "Términos y condiciones de compra en The Makeup / AMAREA: productos originales, precios en MXN, pago seguro con Mercado Pago y envíos a todo México.",
  alternates: { canonical: `${SITE_URL}/terminos` },
};

export default function Terminos() {
  return (
    <>
      <SiteHeader variant="landing" />
      <main className="legal-page">
        <h1 className="serif">Términos y condiciones</h1>
        <p className="legal-updated">Última actualización: julio 2026</p>

        <h2>1. Sobre la tienda</h2>
        <p>
          {SITE_NAME} (AMAREA) es una tienda en línea de maquillaje que vende por
          pieza a consumidoras y al mayoreo a revendedoras, con envíos a toda la
          República Mexicana. Al realizar una compra, aceptas estos términos.
        </p>

        <h2>2. Productos</h2>
        <p>
          Todos nuestros productos son <strong>100% originales</strong> de marcas
          importadas (e.l.f, NYX, Maybelline, L&apos;Oréal, Pixi y más). Las
          imágenes son ilustrativas; los tonos pueden variar ligeramente según la
          pantalla. La disponibilidad está sujeta a existencias.
        </p>

        <h2>3. Precios y pagos</h2>
        <p>
          Los precios están en <strong>pesos mexicanos (MXN)</strong>, con IVA
          incluido, y pueden cambiar sin previo aviso; el precio válido es el
          mostrado al momento de tu compra. El pago se procesa de forma segura a
          través de <strong>Mercado Pago</strong> (tarjeta de crédito/débito,
          transferencia SPEI y efectivo en OXXO). No almacenamos los datos de tu
          tarjeta.
        </p>

        <h2>4. Envíos</h2>
        <p>
          Enviamos a todo México por paquetería con número de rastreo. El envío
          es <strong>gratis en compras desde $599 MXN</strong>; en compras
          menores tiene un costo fijo de <strong>$129 MXN</strong>. Los tiempos de
          entrega son estimados (aprox. 2 a 5 días hábiles según el destino) y
          dependen de la paquetería.
        </p>

        <h2>5. Cambios y devoluciones</h2>
        <p>
          Por higiene, los productos de maquillaje no admiten cambios ni
          devoluciones una vez entregados. Sí resolvemos productos dañados,
          defectuosos o equivocados. Consulta el detalle en nuestra{" "}
          <Link href="/devoluciones">Política de cambios y devoluciones</Link>.
        </p>

        <h2>6. Contacto</h2>
        <p>
          Para cualquier duda: WhatsApp{" "}
          <a
            href="https://wa.me/5215543813568"
            target="_blank"
            rel="noreferrer"
          >
            +52 55 4381 3568
          </a>{" "}
          o correo{" "}
          <a href="mailto:ventas@themakeup.com.mx">ventas@themakeup.com.mx</a>.
        </p>

        <h2>7. Legislación aplicable</h2>
        <p>
          Estos términos se rigen por las leyes de los Estados Unidos Mexicanos.
          Cualquier controversia se atenderá conforme a la Ley Federal de
          Protección al Consumidor (PROFECO) y ante los tribunales de la Ciudad
          de México.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
