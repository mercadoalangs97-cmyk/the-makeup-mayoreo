import Link from "next/link";
import { imgOpt } from "../lib/img";

// Sección editorial de la home: contenido de maquillaje pensado para SEO
// (texto indexable + FAQ con datos estructurados). Se renderiza en el
// servidor para que Google lo lea completo.
//
// IMG_BRUSHES: Unsplash (licencia Unsplash — uso comercial gratuito, sin
// atribución obligatoria). Servida desde su CDN oficial images.unsplash.com.
// Banner ancho: foto propia (bucket product-photos/sitio) — servida optimizada.
const IMG_BANNER =
  "https://yekvehkmgunoafccwmyp.supabase.co/storage/v1/object/public/product-photos/sitio/banner-ojos.jpg";
// Imagen propia (bucket product-photos/sitio) — se sirve optimizada con imgOpt.
const IMG_ELF_GLOW =
  "https://yekvehkmgunoafccwmyp.supabase.co/storage/v1/object/public/product-photos/sitio/elf-glow-reviver.jpg";

const FAQS = [
  {
    q: "¿Los productos de maquillaje son originales?",
    a: "Sí. Todo nuestro catálogo es 100% original, de marcas importadas como e.l.f, NYX Professional Makeup, Maybelline New York, L'Oréal Paris y Pixi. No vendemos imitaciones.",
  },
  {
    q: "¿Hacen envíos a todo México?",
    a: "Sí, enviamos a toda la República Mexicana por paquetería con número de rastreo. El envío es GRATIS en compras desde $599 MXN; en compras menores tiene un costo fijo de $129 MXN.",
  },
  {
    q: "¿Cómo puedo pagar mi maquillaje?",
    a: "El pago es 100% seguro a través de Mercado Pago: acepta tarjetas de crédito y débito, transferencia SPEI y pagos en efectivo en OXXO.",
  },
  {
    q: "¿Venden maquillaje al mayoreo para revender?",
    a: "Sí. Además de la venta por pieza, tenemos lotes de maquillaje al mayoreo para revendedoras, desde 10 hasta 500 piezas.",
  },
];

export default function HomeSeo() {
  // Datos estructurados FAQPage → Google puede mostrar las preguntas en los
  // resultados de búsqueda (rich results).
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      {/* Banner visual (brochas rosas — combina con la identidad AMARÉA) */}
      <section className="hs-banner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgOpt(IMG_BANNER, 1100) ?? IMG_BANNER}
          alt="Mirada con sombra malva — maquillaje de ojos de marcas originales en AMARÉA México"
          loading="lazy"
          decoding="async"
        />
      </section>

      {/* Editorial: texto SEO + imagen */}
      <section className="hs-editorial">
        <div className="hs-editorial-grid">
          <div className="hs-editorial-txt">
            <h2 className="serif">Maquillaje original, sin pagar de más</h2>
            <p>
              En <strong>AMARÉA</strong> encuentras <strong>maquillaje 100%
              original</strong> de las marcas que amas — <strong>e.l.f
              Cosmetics, NYX Professional Makeup, Maybelline New York,
              L&apos;Oréal Paris y Pixi</strong> — pieza por pieza y con envío a
              todo México. Importamos directamente para ofrecerte precios más
              accesibles que en tienda departamental.
            </p>
            <p>
              Explora <strong>labiales</strong> mate y glossy,{" "}
              <strong>bases y correctores</strong> para todo tipo de piel,{" "}
              <strong>sombras de ojos</strong>, <strong>rubores</strong>,{" "}
              <strong>máscaras de pestañas</strong>, productos para{" "}
              <strong>cejas</strong> y <strong>skincare</strong>. Cada producto
              se empaca con cuidado y viaja protegido hasta tu puerta.
            </p>
            <ul className="hs-bullets">
              <li>💄 Marcas importadas 100% originales</li>
              <li>🚚 Envío a todo México · gratis desde $599</li>
              <li>🔒 Pago seguro con Mercado Pago (tarjeta, SPEI y OXXO)</li>
              <li>📦 Empaque protegido y número de rastreo</li>
            </ul>
          </div>
          <div className="hs-editorial-img">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgOpt(IMG_ELF_GLOW, 700) ?? IMG_ELF_GLOW}
              alt="Lip oils e.l.f Glow Reviver en tonos Wild Cherry, Pink Quartz, Cherry Cola y Cinnamon Dreamz — labiales e.l.f originales en México"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </section>

      {/* FAQ (texto indexable + rich results) */}
      <section className="hs-faq">
        <h2 className="serif">Preguntas frecuentes</h2>
        <div className="hs-faq-list">
          {FAQS.map((f) => (
            <details key={f.q} className="hs-faq-item">
              <summary>{f.q}</summary>
              <p>
                {f.a}
                {f.q.includes("mayoreo") && (
                  <>
                    {" "}
                    <Link href="/mayoreo">Conoce los lotes de mayoreo →</Link>
                  </>
                )}
              </p>
            </details>
          ))}
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
