import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { CartProvider } from "./lib/cart";
import { GA_ID, META_PIXEL_ID } from "./lib/analytics";
import { SITE_URL, SITE_NAME } from "./lib/site";
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

        {/* Meta (Facebook) Pixel — solo si hay ID configurado. Al ponerlo en
            NEXT_PUBLIC_META_PIXEL_ID (Vercel), se activa y espeja los eventos. */}
        {META_PIXEL_ID && (
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');fbq('track', 'PageView');`}
          </Script>
        )}

        {/* Datos estructurados del negocio (SEO: Google entiende que eres una
            tienda de maquillaje en México) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Store",
              name: SITE_NAME,
              url: SITE_URL,
              description:
                "Tienda de maquillaje original por pieza: e.l.f, NYX, Maybelline, L'Oréal y más. Envío a todo México.",
              telephone: "+525543813568",
              areaServed: "MX",
              currenciesAccepted: "MXN",
              paymentAccepted: "Mercado Pago, Visa, Mastercard, SPEI, OXXO",
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: SITE_NAME,
              url: SITE_URL,
              potentialAction: {
                "@type": "SearchAction",
                target: `${SITE_URL}/amarea?q={search_term_string}`,
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />

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
