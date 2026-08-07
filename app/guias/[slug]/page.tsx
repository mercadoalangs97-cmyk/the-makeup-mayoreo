import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SITE_URL, SITE_NAME } from "../../lib/site";
import { getGuia, GUIAS, guiaImg, type Bloque } from "../../lib/guias";
import { imgOpt } from "../../lib/img";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return GUIAS.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const g = getGuia(slug);
  if (!g) return { title: "Guía no encontrada · The Makeup CDMX" };
  return {
    // tituloSeo (≤60) en vez del titulo largo: el buscador corta ahí y el
    // sufijo de marca se comía la parte útil. El titulo largo sigue en el H1.
    title: g.tituloSeo,
    description: g.descripcion,
    keywords: g.keywords,
    alternates: { canonical: `${SITE_URL}/guias/${g.slug}` },
    openGraph: { title: g.titulo, description: g.descripcion, type: "article" },
  };
}

function BloqueView({ b }: { b: Bloque }) {
  if (b.t === "h2") return <h2>{b.text}</h2>;
  if (b.t === "ul")
    return (
      <ul>
        {b.items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    );
  if (b.t === "cta")
    return (
      <p>
        <Link href={b.href} className="guia-cta">
          {b.text}
        </Link>
      </p>
    );
  return <p dangerouslySetInnerHTML={{ __html: b.html }} />;
}

export default async function GuiaPage({ params }: Params) {
  const { slug } = await params;
  const g = getGuia(slug);
  if (!g) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: g.titulo,
    image: guiaImg(g.slug),
    description: g.descripcion,
    datePublished: g.fecha,
    dateModified: g.fecha,
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: { "@type": "Organization", name: SITE_NAME },
    mainEntityOfPage: `${SITE_URL}/guias/${g.slug}`,
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Guías", item: `${SITE_URL}/guias` },
      {
        "@type": "ListItem",
        position: 3,
        name: g.titulo,
        item: `${SITE_URL}/guias/${g.slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <SiteHeader variant="landing" />
      <main className="legal-page guia-article">
        <nav className="guia-breadcrumb">
          <Link href="/">Inicio</Link> <span>/</span>{" "}
          <Link href="/guias">Guías</Link> <span>/</span> {g.titulo}
        </nav>
        <h1 className="serif">{g.titulo}</h1>
        <p className="legal-updated">Actualizado: julio 2026 · {SITE_NAME}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="guia-hero-img"
          src={imgOpt(guiaImg(g.slug), 1000) ?? guiaImg(g.slug)}
          alt={g.titulo}
        />
        {g.cuerpo.map((b, i) => (
          <BloqueView key={i} b={b} />
        ))}
        <p style={{ marginTop: 32 }}>
          <Link href="/guias">← Ver más guías</Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
