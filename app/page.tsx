import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "./lib/site";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";

export const metadata: Metadata = {
  title: "The Makeup Mayoreo CDMX · Maquillaje al mayoreo y por pieza",
  description:
    "Las mejores marcas de beauty: e.l.f, NYX, Maybelline, L'Oréal y más. Compra lotes al mayoreo para revender, o por pieza en AMAREA. Envío a todo México.",
  alternates: { canonical: SITE_URL },
};

const BASE_LOTES =
  "https://yekvehkmgunoafccwmyp.supabase.co/storage/v1/object/public/lotes-fotos";
const BASE_PROD =
  "https://yekvehkmgunoafccwmyp.supabase.co/storage/v1/object/public/product-photos";

export default function Landing() {
  return (
    <>
      <SiteHeader variant="landing" />

      <section className="landing-hero">
        <div className="landing-hero-inner">
          <div className="landing-eyebrow">Las mejores marcas de beauty</div>
          <h1 className="landing-h1 serif">
            Una marca, <em>dos formas</em> de comprar
          </h1>
          <p className="landing-sub">
            e.l.f, NYX, Maybelline, L&apos;Oréal y más. Elige cómo quieres
            comprar: lotes al por mayor para revender, o tus productos
            favoritos por pieza.
          </p>
        </div>
      </section>

      <section className="landing-cards">
        {/* MAYOREO */}
        <Link href="/mayoreo" className="store-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${BASE_LOTES}/lote-50-mixto.png`}
            alt="Lotes de maquillaje al mayoreo"
            loading="eager"
          />
          <div className="store-card-overlay">
            <div className="store-card-tag">Para revendedoras</div>
            <div className="store-card-name serif">The Makeup Mayoreo</div>
            <p className="store-card-desc">
              Lotes mixtos de 10 a 500 piezas a precio de mayoreo. Compra
              barato y revende.
            </p>
            <span className="store-card-btn">Comprar al mayoreo →</span>
          </div>
        </Link>

        {/* AMAREA */}
        <Link href="/amarea" className="store-card">
          <div className="store-collage" aria-hidden="true">
            {[
              "EL-PAPA-149-1.png",
              "NY-082-1.png",
              "MA-10LI-163-1.png",
              "EL-COPP-088-1.png",
            ].map((f) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={f} src={`${BASE_PROD}/${f}`} alt="" loading="eager" />
            ))}
          </div>
          <div className="store-card-overlay">
            <div className="store-card-tag">Para consumidor final</div>
            <div className="store-card-name serif">AMAREA</div>
            <p className="store-card-desc">
              Tus marcas favoritas por pieza, con envío a todo México. Belleza
              importada, unidad por unidad.
            </p>
            <span className="store-card-btn">Comprar por pieza →</span>
          </div>
        </Link>
      </section>

      <SiteFooter />
    </>
  );
}
