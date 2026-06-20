import type { Metadata } from "next";
import { SITE_URL } from "../lib/site";
import MayoreoClient from "./MayoreoClient";

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
  alternates: { canonical: `${SITE_URL}/mayoreo` },
};

export default function MayoreoPage() {
  return <MayoreoClient />;
}
