import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "../lib/site";
import { GUIAS, guiaImg } from "../lib/guias";
import { imgOpt } from "../lib/img";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

export const metadata: Metadata = {
  title: "Guías de maquillaje · The Makeup CDMX",
  description:
    "Guías prácticas de maquillaje: cómo elegir tu base, saber si un producto es original, vender al mayoreo y elegir labiales. Por AMAREA.",
  alternates: { canonical: `${SITE_URL}/guias` },
};

export default function GuiasIndex() {
  return (
    <>
      <SiteHeader variant="landing" />
      <main className="legal-page">
        <h1 className="serif">Guías de maquillaje</h1>
        <p className="legal-updated">
          Consejos prácticos para elegir, comprar y vender maquillaje.
        </p>
        <div className="guias-grid">
          {GUIAS.map((g) => (
            <Link key={g.slug} href={`/guias/${g.slug}`} className="guia-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="guia-card-img"
                src={imgOpt(guiaImg(g.slug), 500) ?? guiaImg(g.slug)}
                alt={g.titulo}
                loading="lazy"
              />
              <div className="guia-card-body">
                <h2>{g.titulo}</h2>
                <p>{g.descripcion}</p>
                <span className="guia-card-link">Leer →</span>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
