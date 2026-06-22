import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";

export default function CheckoutError() {
  return (
    <>
      <SiteHeader variant="landing" />
      <main className="checkout-estado">
        <div className="ce-icon ce-err">✕</div>
        <h1 className="ce-titulo serif">El pago no se completó</h1>
        <p className="ce-texto">
          No pudimos procesar tu pago. No se hizo ningún cargo y tu carrito
          sigue disponible. Puedes intentar de nuevo o pedir por WhatsApp.
        </p>
        <div className="ce-acciones">
          <Link href="/amarea" className="btn-primary">
            Volver a la tienda
          </Link>
          <a
            href="https://wa.me/5215543813568?text=Hola!%20Tuve%20un%20problema%20con%20el%20pago%20y%20quiero%20completar%20mi%20pedido"
            className="btn-outline"
            target="_blank"
            rel="noreferrer"
          >
            Pedir por WhatsApp
          </a>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
