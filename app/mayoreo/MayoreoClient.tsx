"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  LOTES,
  WPP,
  fmx,
  PPU_REFERENCIA,
  type Lote,
} from "../lib/lotes";
import { useCart } from "../lib/cart";
import { imgOpt } from "../lib/img";
import { gaLead } from "../lib/analytics";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

type Filtro = "todos" | "mixto" | "labiales" | "grande";

const AVATAR_COLORS = ["#C9807A", "#9E5550", "#C9A96E", "#D4B8A8", "#2C2420"];

// Tabla de precio por pieza, calculada de LOTES (nunca a mano: si cambia un
// precio, la tabla cambia sola y no se contradice con las tarjetas de arriba).
const TABLA_PRECIOS = (() => {
  const filas = LOTES.filter((l) => l.id.startsWith("mixto-"))
    .slice()
    .sort((a, b) => a.piezas - b.piezas)
    .map((l) => ({
      id: l.id,
      piezas: l.piezas,
      precio: l.precio,
      ppu: Math.round(l.precio / l.piezas),
      ahorro: 0,
      mejor: false,
    }));
  const caro = Math.max(...filas.map((f) => f.ppu));
  const barato = Math.min(...filas.map((f) => f.ppu));
  filas.forEach((f) => {
    f.ahorro = caro - f.ppu;
    f.mejor = f.ppu === barato;
  });
  return filas;
})();

// Las 4 preguntas que Google muestra en "Más preguntas" para las búsquedas por
// las que queremos salir. Responderlas aquí, en texto visible, es lo que hace
// que la página sea citable (el marcado FAQ ya no da resultados enriquecidos).
const PREGUNTAS = [
  {
    q: "¿Dónde comprar maquillaje original por mayoreo en México?",
    a: "Con un proveedor que te diga qué marcas maneja y de dónde vienen. Nosotros importamos directo e.l.f Cosmetics, NYX Professional Makeup, Maybelline New York, L'Oréal Paris y Pixi, y vendemos en lotes surtidos desde 10 piezas con envío por Estafeta a toda la República. Todo se paga en línea con Mercado Pago o se coordina por WhatsApp.",
  },
  {
    q: "¿Cuánto cuesta un lote de maquillaje para revender?",
    a: `Nuestros lotes van de ${fmx(1200)} (10 piezas, ${"$120"} por pieza) a ${fmx(45700)} (500 piezas, $91 por pieza). Entre más grande el lote, más barata te sale la pieza. La tabla completa está arriba, sin registro ni tener que preguntar.`,
  },
  {
    q: "¿Cuánto puedo ganar revendiendo maquillaje?",
    a: `Depende del precio al que vendas. Tomando ${fmx(PPU_REFERENCIA)} por pieza —el promedio al que se vende esta clase de producto en tienda— un lote de 50 piezas que te cuesta ${fmx(5100)} se vende en ${fmx(PPU_REFERENCIA * 50)}. Tu ganancia real depende de tu precio, tu mercado y qué tan rápido rotes.`,
  },
  {
    q: "¿Cuál es la diferencia con el maquillaje del Centro de la CDMX?",
    a: "Son mercados distintos. En el Centro encuentras marcas nacionales y de importación económica desde unos pesos la pieza; nosotros vendemos marcas originales de farmacia y tienda departamental (e.l.f, NYX, Maybelline, L'Oréal), que cuestan más por pieza y también se revenden mucho más caro. Ninguno es mejor: depende de a quién le vendas tú.",
  },
];

// Hechos verificables del servicio (NO testimonios). Las opiniones reales de
// clientas se agregarán aquí cuando existan, con su nombre y autorización.
const GARANTIAS = [
  {
    icono: "💄",
    titulo: "Marcas originales",
    texto:
      "e.l.f, NYX Professional Makeup, Maybelline, L'Oréal Paris, Pixi y Starface. Nunca imitaciones.",
  },
  {
    icono: "📦",
    titulo: "Lotes surtidos desde 10 piezas",
    texto:
      "Empiezas con lo que puedas invertir y creces a tu ritmo, hasta lotes de 500 piezas.",
  },
  {
    icono: "🚚",
    titulo: "Envío con número de guía",
    texto:
      "A toda la República por Estafeta, con rastreo y empaque protegido.",
  },
  {
    icono: "🔒",
    titulo: "Pago seguro con Mercado Pago",
    texto:
      "Tarjeta, transferencia SPEI o efectivo en OXXO. Tu dinero protegido por la plataforma.",
  },
];

const CATEGORIAS = [
  { emoji: "👁️", nombre: "Ojos", sub: "Sombras · mascaras · delineadores" },
  { emoji: "💋", nombre: "Labios", sub: "Labiales · glosses · liners" },
  { emoji: "✨", nombre: "Rostro", sub: "Bases · rubores · primers" },
];

// % de descuento del lote vs. comprar las piezas a precio individual promedio.
function descuentoPorLote(l: Lote): number {
  const ppu = l.precio / l.piezas;
  return Math.max(0, Math.round((1 - ppu / PPU_REFERENCIA) * 100));
}

// Ganancia estimada si la revendedora vende cada pieza al precio promedio de
// tienda (PPU_REFERENCIA). Es un ESTIMADO y así se comunica en la página.
function gananciaEstimada(l: Lote): { venta: number; ganancia: number } {
  const venta = PPU_REFERENCIA * l.piezas;
  return { venta, ganancia: Math.max(0, venta - l.precio) };
}

export type OpinionPublica = {
  id: string;
  nombre: string;
  ciudad: string | null;
  calificacion: number;
  texto: string;
};

export default function Home({
  opiniones = [],
}: {
  /** Opiniones REALES autorizadas y marcadas como publicadas en el panel.
   *  Si no hay ninguna, la sección no se pinta: nunca inventamos testimonios. */
  opiniones?: OpinionPublica[];
}) {
  const { add, showToast, checkoutMP } = useCart();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [loteActivo, setLoteActivo] = useState<Lote | null>(null);
  const [qtyActual, setQtyActual] = useState(1);

  const modalOpen = loteActivo !== null;

  const lotesFiltrados = useMemo(
    () => (filtro === "todos" ? LOTES : LOTES.filter((l) => l.tipo === filtro)),
    [filtro]
  );

  function agregarLote(l: Lote, qty: number) {
    add(
      {
        id: "lote:" + l.id,
        tipo: "lote",
        nombre: l.nombre,
        precio: l.precio,
        foto: imgOpt(l.foto, 240) ?? l.foto,
        sub: l.piezas + " piezas",
      },
      qty
    );
  }

  function abrirModal(id: string) {
    const l = LOTES.find((x) => x.id === id) ?? null;
    if (!l) return;
    setLoteActivo(l);
    setQtyActual(1);
  }
  function closeModal() {
    setLoteActivo(null);
  }
  function changeQty(d: number) {
    setQtyActual((q) => Math.max(1, q + d));
  }
  function agregarDesdeModal() {
    if (!loteActivo) return;
    agregarLote(loteActivo, qtyActual);
    closeModal();
  }
  function pedirWPP() {
    if (!loteActivo) return;
    const l = loteActivo;
    const ppu = (l.precio / l.piezas).toFixed(2);
    const msg =
      "¡Hola! Quiero pedir:\n\n- " +
      l.nombre +
      " x" +
      qtyActual +
      " = " +
      fmx(l.precio * qtyActual) +
      " MXN ($" +
      ppu +
      "/pieza)" +
      "\n\n¿Me confirma disponibilidad y datos de pago?";
    gaLead("whatsapp_lote_" + l.piezas + "pz"); // mide el contacto (conversión de mayoreo)
    window.open(
      "https://wa.me/" + WPP + "?text=" + encodeURIComponent(msg),
      "_blank"
    );
    closeModal();
  }

  return (
    <>
      <SiteHeader variant="mayoreo" />

      {/* ===== HERO ===== */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-left">
            <div className="hero-eyebrow">✨ Marcas americanas que amas</div>
            <h1 className="hero-h1">
              Maquillaje de <em>primera</em> al mejor precio de mayoreo
            </h1>
            <p className="hero-desc">
              Lotes de 10 a 500 piezas de marcas como e.l.f, NYX, Maybelline,
              L&apos;Oreal y mas. Compra barato, revende y gana. Para
              revendedoras de toda Mexico.
            </p>
            <div className="hero-ship">
              🚚 <span>Envío por paquetería</span> calculado según tu ubicación
            </div>
            <div className="hero-cta">
              <a href="#lotes" className="btn-primary">
                Ver lotes disponibles →
              </a>
              <a href="/amarea" className="btn-outline">
                Comprar por pieza (AMARÉA)
              </a>
            </div>
            <div className="hero-social">
              <div className="hero-avatars">
                {["+", "M", "K", "S"].map((c, i) => (
                  <span key={i} style={{ background: AVATAR_COLORS[i] }}>
                    {c}
                  </span>
                ))}
              </div>
              <div className="hero-social-txt">
                <span className="hero-stars">★★★★★</span> 4.9/5
                <br />
                <b>+500 revendedoras</b> ya nos compran
              </div>
            </div>
          </div>
          <div className="hero-right">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgOpt(
                "https://yekvehkmgunoafccwmyp.supabase.co/storage/v1/object/public/lotes-fotos/lote-50-mixto.png",
                760
              )}
              alt="Lote de 50 piezas con marcas como e.l.f, NYX y Maybelline"
              loading="eager"
            />
            <div className="hero-cards">
              <div className="hcard hcard-1">
                <div className="hcard-tag">⭐ Mas popular</div>
                <div className="hcard-name serif">50 Piezas</div>
                <div className="hcard-price serif">$4,850</div>
                <div className="hcard-unit">solo $97/pieza</div>
              </div>
              <div className="hcard hcard-2">
                <div className="hcard-tag">💰 Mejor precio</div>
                <div className="hcard-name serif">100 Piezas</div>
                <div className="hcard-price serif">$9,300</div>
                <div className="hcard-unit">solo $93/pieza</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== TRUST BADGES ===== */}
      <div className="trust">
        <div className="trust-inner">
          <div className="trust-item">
            <span className="trust-ico">🔒</span>
            <div className="trust-txt">
              <b>Pago seguro</b>
              <span>Mercado Pago y SPEI</span>
            </div>
          </div>
          <div className="trust-item">
            <span className="trust-ico">💄</span>
            <div className="trust-txt">
              <b>Marcas que amas</b>
              <span>e.l.f, NYX, Maybelline y más</span>
            </div>
          </div>
          <div className="trust-item">
            <span className="trust-ico">🚚</span>
            <div className="trust-txt">
              <b>Envío 48h CDMX</b>
              <span>A toda la Republica</span>
            </div>
          </div>
          <div className="trust-item">
            <span className="trust-ico">💬</span>
            <div className="trust-txt">
              <b>+500 revendedoras</b>
              <span>Atencion por WhatsApp</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== CATEGORIAS ===== */}
      <section className="cats-section" id="categorias">
        <div className="section-header">
          <div className="section-eyebrow">Variedad garantizada</div>
          <h2 className="section-title serif">
            Cada lote incluye <em>de todo</em>
          </h2>
          <p className="section-sub">
            Tus lotes vienen surtidos con producto de las tres grandes
            categorías de maquillaje. Sin piezas repetidas.
          </p>
        </div>
        <div className="cats-grid">
          {CATEGORIAS.map((c) => (
            <a key={c.nombre} href="#lotes" className="cat-card">
              <div className="cat-emoji">{c.emoji}</div>
              <div className="cat-name serif">{c.nombre}</div>
              <div className="cat-sub">{c.sub}</div>
            </a>
          ))}
        </div>
      </section>

      {/* ===== LOTES ===== */}
      <section className="section" id="lotes">
        <div className="section-header">
          <div className="section-eyebrow">Inventario disponible</div>
          <h2 className="section-title serif">
            Elige tu <em>lote ideal</em>
          </h2>
          <p className="section-sub">
            Entre más grande el lote, menor el precio por pieza. El lote de 500
            piezas y el de labiales se coordinan por WhatsApp.
          </p>
        </div>

        <div className="freeship-bar">
          <span className="fs-ico">🚚</span>
          <span className="fs-main">
            <b>ENVÍO POR PAQUETERÍA</b> · aprox. $137 a $250 según tu C.P.
          </span>
        </div>

        {/* Costo y tiempo de envío ANTES de pedir datos (evita la sorpresa final) */}
        <div className="envio-aviso">
          <span className="envio-aviso-ico">📦</span>
          <div>
            <b>¿Cuánto cuesta el envío?</b>
            <p>
              Enviamos por <strong>Estafeta</strong> a toda la República con número
              de guía. Según el tamaño del lote y tu C.P., normalmente entre{" "}
              <strong>$137 y $250 MXN</strong>, con entrega de{" "}
              <strong>1 a 5 días hábiles</strong>. El costo exacto lo calculamos con
              tu código postal antes de pagar — sin sorpresas al final.
            </p>
          </div>
        </div>

        <div className="filters">
          {(
            [
              ["todos", "Todos"],
              ["mixto", "Mixtos"],
              ["labiales", "Labiales"],
              ["grande", "100+ piezas"],
            ] as [Filtro, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              className={"filter-btn" + (filtro === key ? " active" : "")}
              onClick={() => setFiltro(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="lotes-grid">
          {lotesFiltrados.map((l) => {
            const ppu = (l.precio / l.piezas).toFixed(0);
            const ahorro = descuentoPorLote(l);
            return (
              <div
                key={l.id}
                className={"lote-card" + (l.popular ? " is-popular" : "")}
                onClick={() => abrirModal(l.id)}
              >
                <div className="lote-card-img">
                  {l.foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imgOpt(l.foto, 520)}
                      alt={l.nombre}
                      loading="lazy"
                      decoding="async"
                      width={520}
                      height={520}
                    />
                  ) : (
                    <div className="lote-img-ph">
                      <div className="ph-emoji">💄</div>
                      <p>Foto proximamente</p>
                    </div>
                  )}
                  <div className="lote-badge">{l.piezas} piezas</div>
                  {l.popular ? (
                    <div className="badge-tr badge-popular">★ Más vendido</div>
                  ) : l.wppOnly ? (
                    <div className="badge-tr badge-wpp">Solo WhatsApp</div>
                  ) : ahorro > 0 ? (
                    <div className="badge-tr badge-save-img">
                      −{ahorro}%
                    </div>
                  ) : null}
                </div>
                <div className="lote-body">
                  <div className="lote-tag">{l.tag}</div>
                  <div className="lote-name serif">{l.nombre}</div>
                  <p className="lote-desc">{l.desc}</p>
                  <div className="price-block">
                    <div className="price-row">
                      <span className="lote-price serif">{fmx(l.precio)}</span>
                      <span className="lote-currency">MXN</span>
                    </div>
                    <div className="ppu-pill">
                      💸 <b>${ppu}</b> por pieza
                    </div>
                    {ahorro > 0 && (
                      <div className="save-line">
                        ✓ Ahorras {ahorro}% vs. comprar individual
                      </div>
                    )}
                    {(() => {
                      const g = gananciaEstimada(l);
                      return g.ganancia > 0 ? (
                        <div className="ganancia-box">
                          <span className="ganancia-lbl">Tu ganancia estimada</span>
                          <b className="ganancia-monto">{fmx(g.ganancia)}</b>
                          <span className="ganancia-det">
                            si vendes las {l.piezas} piezas a ${PPU_REFERENCIA} c/u
                          </span>
                        </div>
                      ) : null;
                    })()}
                    {l.wppOnly ? (
                      <button
                        className="lote-btn-wpp"
                        onClick={(e) => {
                          e.stopPropagation();
                          abrirModal(l.id);
                        }}
                      >
                        Pedir por WhatsApp
                      </button>
                    ) : (
                      <div className="btn-row">
                        <button
                          className="lote-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            abrirModal(l.id);
                          }}
                        >
                          Comprar ahora
                        </button>
                        <button
                          className="btn-cart"
                          title="Anadir al carrito"
                          onClick={(e) => {
                            e.stopPropagation();
                            agregarLote(l, 1);
                          }}
                        >
                          🛒
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== TABLA DE PRECIOS POR PIEZA =====
          Nadie en el sector publica esto. Es el dato que la clienta quiere
          antes de escribir y el que los buscadores de IA citan cuando alguien
          pregunta "cuánto cuesta el maquillaje al mayoreo en México". */}
      <section className="tabla-section" id="precios">
        <div className="section-header">
          <div className="section-eyebrow">Sin letras chiquitas</div>
          <h2 className="section-title serif">
            Cuánto te sale <em>cada pieza</em>
          </h2>
          <p className="section-sub">
            Entre más grande el lote, más barata la pieza. Estos son todos
            nuestros precios, sin registro ni tener que preguntar.
          </p>
        </div>

        <div className="tabla-wrap">
          <table className="tabla-precios">
            <thead>
              <tr>
                <th>Lote</th>
                <th>Precio</th>
                <th>Por pieza</th>
                <th>Ahorro por pieza</th>
              </tr>
            </thead>
            <tbody>
              {TABLA_PRECIOS.map((f) => (
                <tr key={f.id} className={f.mejor ? "fila-mejor" : undefined}>
                  <td data-lb="Lote">
                    <b>{f.piezas} piezas</b>
                    {f.mejor && <span className="tag-mejor">mejor precio</span>}
                  </td>
                  <td data-lb="Precio">{fmx(f.precio)}</td>
                  <td data-lb="Por pieza">
                    <b>${f.ppu}</b>
                  </td>
                  <td data-lb="Ahorro">
                    {f.ahorro > 0 ? (
                      <span className="ahorro">−${f.ahorro}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="tabla-nota">
          Precios en pesos mexicanos, IVA incluido. El envío se cotiza aparte
          por Estafeta según tu código postal (normalmente entre $137 y $250).
          El lote de 500 piezas se coordina por WhatsApp.
        </p>
      </section>

      {/* ===== SOCIAL PROOF BAND ===== */}
      <section className="proof">
        <div className="proof-grid">
          <div>
            <div className="proof-num serif">+500</div>
            <div className="proof-label">Revendedoras activas</div>
          </div>
          <div>
            <div className="proof-num serif">
              4.9<em>★</em>
            </div>
            <div className="proof-label">Calificación promedio</div>
          </div>
          <div>
            <div className="proof-num serif">100%</div>
            <div className="proof-label">Marcas auténticas</div>
          </div>
          <div>
            <div className="proof-num serif">48h</div>
            <div className="proof-label">Entrega en CDMX</div>
          </div>
        </div>
      </section>

      {/* ===== HOW ===== */}
      <section className="how-section" id="como-funciona">
        <div className="section-header">
          <div className="section-eyebrow">Proceso simple</div>
          <h2 className="section-title serif">
            Comprar es <em>muy fácil</em>
          </h2>
          <p className="section-sub">
            En 4 pasos recibes tu lote listo para revender.
          </p>
        </div>
        <div className="steps-grid">
          <div className="step">
            <div className="step-num serif">1</div>
            <div className="step-title serif">Elige tu lote</div>
            <div className="step-desc">
              Desde 10 piezas para empezar hasta 500 para distribuidoras. Entre
              más grande, mejor precio por pieza.
            </div>
          </div>
          <div className="step">
            <div className="step-num serif">2</div>
            <div className="step-title serif">Paga seguro</div>
            <div className="step-desc">
              Mercado Pago: tarjeta, SPEI u OXXO. O cierra directo por WhatsApp
              si prefieres.
            </div>
          </div>
          <div className="step">
            <div className="step-num serif">3</div>
            <div className="step-title serif">Confirmamos</div>
            <div className="step-desc">
              Te enviamos confirmacion por WhatsApp con el desglose de tu lote y
              numero de seguimiento.
            </div>
          </div>
          <div className="step">
            <div className="step-num serif">4</div>
            <div className="step-title serif">Recibe y revende</div>
            <div className="step-desc">
              Envio a toda la Republica. 48h en CDMX. Empaque discreto. Factura
              disponible a peticion.
            </div>
          </div>
        </div>
      </section>

      {/* ===== GARANTÍAS (hechos verificables, no testimonios) ===== */}
      <section className="testi-section" id="opiniones">
        <div className="section-header">
          <div className="section-eyebrow">Por qué comprarnos</div>
          <h2 className="section-title serif">
            Lo que <em>sí te garantizamos</em>
          </h2>
        </div>
        <div className="testi-grid">
          {GARANTIAS.map((g) => (
            <div className="testi-card garantia-card" key={g.titulo}>
              <div className="garantia-ico">{g.icono}</div>
              <b className="garantia-tit">{g.titulo}</b>
              <p className="testi-text">{g.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== OPINIONES REALES (se pinta sola cuando existan) ===== */}
      {opiniones.length > 0 && (
        <section className="ops-section">
          <div className="section-header">
            <div className="section-eyebrow">Clientas reales</div>
            <h2 className="section-title serif">
              Lo que dicen <em>quienes ya compraron</em>
            </h2>
          </div>
          <div className="ops-grid">
            {opiniones.map((o) => (
              <figure className="ops-card" key={o.id}>
                <div
                  className="ops-stars"
                  aria-label={`${o.calificacion} de 5 estrellas`}
                >
                  {"★".repeat(o.calificacion)}
                  <span className="ops-off">
                    {"★".repeat(5 - o.calificacion)}
                  </span>
                </div>
                <blockquote>{o.texto}</blockquote>
                <figcaption>
                  <b>{o.nombre}</b>
                  {o.ciudad ? ` · ${o.ciudad}` : ""}
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="ops-nota">
            Opiniones de clientas que autorizaron publicarlas. No editamos el
            texto.
          </p>
        </section>
      )}

      {/* ===== PREGUNTAS (respuesta directa, formato citable) ===== */}
      <section className="faq-section" id="preguntas">
        <div className="section-header">
          <div className="section-eyebrow">Lo que más nos preguntan</div>
          <h2 className="section-title serif">
            Dudas <em>antes de comprar</em>
          </h2>
        </div>
        <div className="faq-lista">
          {PREGUNTAS.map((p) => (
            <details className="faq-item" key={p.q}>
              <summary>{p.q}</summary>
              <p>{p.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ===== GUÍAS (enlazado interno) =====
          Esta página no enlazaba a ninguna guía: las cuatro estaban aisladas y
          Google no tenía cómo entender que el sitio sabe del tema. Son además
          el contenido que los buscadores de IA citan. */}
      <section className="guias-mini">
        <div className="section-header">
          <div className="section-eyebrow">Antes de comprar</div>
          <h2 className="section-title serif">
            Lo que <em>necesitas saber</em>
          </h2>
        </div>
        {/* Las 4 que le sirven a una REVENDEDORA. Las de consumidora (base,
            labiales) viven en /amarea, que es donde compra ella. */}
        <div className="guias-mini-grid">
          <Link
            className="guia-mini"
            href="/guias/cuanto-cuesta-empezar-a-vender-maquillaje"
          >
            <span className="guia-mini-ico">💸</span>
            <b>¿Cuánto cuesta empezar a vender maquillaje?</b>
            <span>Números reales: lotes, envío, comisiones y ganancia.</span>
          </Link>
          <Link className="guia-mini" href="/guias/que-lote-de-maquillaje-comprar">
            <span className="guia-mini-ico">📦</span>
            <b>¿Qué lote me conviene?</b>
            <span>Cuál elegir según tu presupuesto y cómo vendes.</span>
          </Link>
          <Link
            className="guia-mini"
            href="/guias/maquillaje-centro-cdmx-vs-original-importado"
          >
            <span className="guia-mini-ico">⚖️</span>
            <b>Centro de CDMX vs. original importado</b>
            <span>Comparativa honesta: cuál negocio es el tuyo.</span>
          </Link>
          <Link
            className="guia-mini"
            href="/guias/como-vender-maquillaje-al-mayoreo"
          >
            <span className="guia-mini-ico">🛍️</span>
            <b>Cómo empezar a vender al mayoreo</b>
            <span>Cómo poner precios y dónde vender.</span>
          </Link>
        </div>
      </section>

      {/* ===== BANNER MAYOREO ===== */}
      <div className="banner-mayoreo">
        <div className="b-eyebrow">Para distribuidoras</div>
        <h2 className="serif">¿Necesitas el lote de 500 piezas?</h2>
        <p>
          El precio por pieza más bajo: $91 MXN. Coordinamos un envío especial y
          atención personalizada para tu negocio.
        </p>
        <a
          href="https://wa.me/5215543813568?text=Hola!%20Me%20interesa%20el%20lote%20de%20500%20piezas%20(%2445%2C700%20MXN).%20Podemos%20coordinar%3F"
          className="banner-btn"
          target="_blank"
          rel="noreferrer"
          onClick={() => gaLead("whatsapp_lote_500pz")}
        >
          Cotizar lote de 500 piezas →
        </a>
      </div>

      <SiteFooter />

      {/* ===== MODAL DETALLE LOTE ===== */}
      <div
        className={"modal-overlay" + (modalOpen ? " open" : "")}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeModal();
        }}
      >
        <div className="modal">
          <button className="modal-close" onClick={closeModal}>
            ✕
          </button>
          <div className="modal-handle"></div>
          {loteActivo && (
            <>
              <div>
                {loteActivo.foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imgOpt(loteActivo.foto, 900)}
                    alt={loteActivo.nombre}
                    className="modal-img"
                  />
                ) : (
                  <div className="modal-img-ph">💄</div>
                )}
              </div>
              <div className="modal-etiq">{loteActivo.tag}</div>
              <div className="modal-nombre serif">{loteActivo.nombre}</div>
              <div>
                <span className="modal-precio serif">
                  {fmx(loteActivo.precio)} MXN
                </span>
                <span className="modal-ppu">
                  💸 ${(loteActivo.precio / loteActivo.piezas).toFixed(0)} por
                  pieza
                </span>
              </div>
              {descuentoPorLote(loteActivo) > 0 && (
                <div className="modal-save">
                  ✓ Ahorras {descuentoPorLote(loteActivo)}% comprando por pieza
                </div>
              )}
              {(() => {
                const g = gananciaEstimada(loteActivo);
                if (g.ganancia <= 0) return null;
                return (
                  <div className="modal-ganancia">
                    <div className="mg-tit">💰 Tu negocio con este lote</div>
                    <div className="mg-row">
                      <span>Inviertes</span>
                      <b>{fmx(loteActivo.precio * qtyActual)}</b>
                    </div>
                    <div className="mg-row">
                      <span>
                        Vendes {loteActivo.piezas * qtyActual} pzas a ${PPU_REFERENCIA}
                      </span>
                      <b>{fmx(g.venta * qtyActual)}</b>
                    </div>
                    <div className="mg-row mg-total">
                      <span>Ganancia estimada</span>
                      <b>{fmx(g.ganancia * qtyActual)}</b>
                    </div>
                    <p className="mg-nota">
                      Estimado con el precio promedio de tienda (${PPU_REFERENCIA} por
                      pieza). Tu ganancia real depende del precio al que vendas.
                    </p>
                  </div>
                );
              })()}
              <div className="modal-div"></div>
              <div className="modal-sec">Incluye</div>
              <ul className="modal-features">
                {loteActivo.features.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
              <div className="modal-div"></div>
              <div className="modal-qty-row">
                <span className="modal-qty-label">Lotes a pedir:</span>
                <div className="modal-qty-ctrl">
                  <button className="modal-qty-btn" onClick={() => changeQty(-1)}>
                    -
                  </button>
                  <span className="modal-qty-num">{qtyActual}</span>
                  <button className="modal-qty-btn" onClick={() => changeQty(1)}>
                    +
                  </button>
                </div>
              </div>
              <div className="total-box">
                <div>
                  <div className="total-label">Total</div>
                  <div className="total-sub">+ envio al confirmar</div>
                </div>
                <div className="total-val serif">
                  {fmx(loteActivo.precio * qtyActual)}
                </div>
              </div>
              <div>
                {loteActivo.wppOnly ? (
                  <div className="modal-btns">
                    <button className="btn-wpp-full" onClick={pedirWPP}>
                      Pedir por WhatsApp
                    </button>
                  </div>
                ) : (
                  <>
                    <button className="btn-add-cart" onClick={agregarDesdeModal}>
                      + Anadir al carrito
                    </button>
                    <div className="modal-btns">
                      <button className="btn-mp-sm" onClick={checkoutMP}>
                        Mercado Pago
                      </button>
                      <button className="btn-wpp-sm" onClick={pedirWPP}>
                        WhatsApp
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
