import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { CartProvider } from "./lib/cart";
import { GA_ID } from "./lib/analytics";
import CartDrawer from "./components/CartDrawer";
import Toast from "./components/Toast";
import WppFloat from "./components/WppFloat";

export const metadata: Metadata = {
  title: "The Makeup Mayoreo CDMX · Maquillaje al mayoreo y por pieza",
  description:
    "Las mejores marcas de beauty: e.l.f, NYX, Maybelline, L'Oréal y más. Lotes al mayoreo y productos por pieza (AMAREA). Envío a todo México.",
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
        {/* Google Analytics 4 — carga en todas las páginas (estrategia
            afterInteractive, la forma recomendada por Next.js). */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
        </Script>
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
