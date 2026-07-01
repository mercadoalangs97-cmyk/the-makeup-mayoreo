"use client";

import Link from "next/link";
import { useEffect } from "react";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import { useCart } from "../../lib/cart";

export default function CheckoutExito() {
  const { clear, hydrated } = useCart();
  // El pago se aprobó: vaciamos el carrito local DESPUÉS de que cargó
  // (si no, la carga desde localStorage lo volvería a llenar).
  useEffect(() => {
    if (hydrated) clear();
  }, [hydrated, clear]);

  return (
    <>
      <SiteHeader variant="landing" />
      <main className="checkout-estado">
        <div className="ce-icon ce-ok">✓</div>
        <h1 className="ce-titulo serif">¡Gracias por tu compra!</h1>
        <p className="ce-texto">
          Tu pago fue aprobado. Te enviaremos la confirmación y los datos de
          envío por correo electrónico. ¡Pronto recibirás tu pedido!
        </p>
        <div className="ce-acciones">
          <Link href="/amarea" className="btn-primary">
            Seguir comprando
          </Link>
          <a
            href="https://wa.me/5215543813568?text=Hola!%20Acabo%20de%20hacer%20una%20compra%20y%20quiero%20confirmar%20mi%20pedido"
            className="btn-outline"
            target="_blank"
            rel="noreferrer"
          >
            Escribir por WhatsApp
          </a>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
