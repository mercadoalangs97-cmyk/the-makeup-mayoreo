"use client";

import Link from "next/link";
import { useEffect } from "react";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import { useCart } from "../../lib/cart";

export default function CheckoutPendiente() {
  const { clear, hydrated } = useCart();
  // La orden quedó registrada; vaciamos el carrito local después de que cargó.
  useEffect(() => {
    if (hydrated) clear();
  }, [hydrated, clear]);

  return (
    <>
      <SiteHeader variant="landing" />
      <main className="checkout-estado">
        <div className="ce-icon ce-pend">⏳</div>
        <h1 className="ce-titulo serif">Tu pago está pendiente</h1>
        <p className="ce-texto">
          Si elegiste pago en <b>OXXO</b> o transferencia <b>SPEI</b>, completa
          el pago con el comprobante que te dio Mercado Pago. En cuanto se
          confirme, apartamos tu pedido y te avisamos por WhatsApp.
        </p>
        <div className="ce-acciones">
          <Link href="/" className="btn-primary">
            Volver al inicio
          </Link>
          <a
            href="https://wa.me/5215543813568?text=Hola!%20Tengo%20un%20pago%20pendiente%20(OXXO%2FSPEI)%20y%20quiero%20confirmar%20mi%20pedido"
            className="btn-outline"
            target="_blank"
            rel="noreferrer"
          >
            Tengo una duda
          </a>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
