import type { Metadata } from "next";

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
  return <>{children}</>;
}
