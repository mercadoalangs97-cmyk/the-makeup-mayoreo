import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CartProvider } from "./lib/cart";
import CartDrawer from "./components/CartDrawer";
import Toast from "./components/Toast";
import WppFloat from "./components/WppFloat";

export const metadata: Metadata = {
  title:
    "The Makeup Mayoreo CDMX - Lotes de Maquillaje · e.l.f, NYX, Maybelline",
  description:
    "Lotes de maquillaje de las mejores marcas de beauty: e.l.f, NYX, Maybelline, L'Oréal y más. Paquetes de 10 a 500 piezas. Para revendedoras en México.",
  keywords: [
    "lotes maquillaje",
    "maquillaje mayoreo",
    "marcas de maquillaje",
    "revendedoras Mexico",
    "e.l.f",
    "NYX",
    "Maybelline",
    "CDMX",
  ],
  openGraph: {
    title:
      "The Makeup Mayoreo CDMX - Lotes de Maquillaje · e.l.f, NYX, Maybelline",
    description:
      "Lotes de las mejores marcas de beauty. Paquetes de 10 a 500 piezas. Para revendedoras en México.",
    locale: "es_MX",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Jost:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <CartProvider>
          {children}
          <CartDrawer />
          <WppFloat />
          <Toast />
        </CartProvider>
      </body>
    </html>
  );
}
