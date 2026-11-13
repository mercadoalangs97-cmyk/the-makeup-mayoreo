import type { Metadata } from "next";
import Script from "next/script";

// El checkout y sus pantallas de resultado no deben salir en buscadores:
// son parte del proceso de compra, no contenido. (page.tsx es "use client",
// que no admite export metadata, por eso va aquí.)
export const metadata: Metadata = {
  title: "Finalizar compra · AMARÉA",
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Device ID de Mercado Pago: su antifraude lo usa para detectar compras
          robadas. Deja window.MP_DEVICE_SESSION_ID, que el checkout manda. */}
      <Script
        src="https://www.mercadopago.com/v2/security.js"
        {...{ view: "checkout" }}
        strategy="afterInteractive"
      />
      {children}
    </>
  );
}
