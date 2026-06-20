import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Makeup Mayoreo CDMX - Lotes de Maquillaje Importado EE.UU.",
  description:
    "Lotes de maquillaje importado de EE.UU. Paquetes de 10 a 500 piezas. Marcas: e.l.f, NYX, Maybelline y mas. Para revendedoras en Mexico.",
  keywords: [
    "lotes maquillaje",
    "maquillaje mayoreo",
    "maquillaje importado",
    "revendedoras Mexico",
    "e.l.f",
    "NYX",
    "Maybelline",
    "CDMX",
  ],
  openGraph: {
    title: "The Makeup Mayoreo CDMX - Lotes de Maquillaje Importado EE.UU.",
    description:
      "Lotes de maquillaje importado de EE.UU. Paquetes de 10 a 500 piezas. Para revendedoras en Mexico.",
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
      <body>{children}</body>
    </html>
  );
}
