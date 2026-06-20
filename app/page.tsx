"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  LOTES,
  WPP,
  fmx,
  ENVIO_GRATIS_DESDE,
  PPU_REFERENCIA,
  type Lote,
} from "./lib/lotes";

type CartItem = {
  id: string;
  nombre: string;
  precio: number;
  foto: string | null;
  qty: number;
};

type Filtro = "todos" | "mixto" | "labiales" | "grande";

// Avatares de "social proof": iniciales con color de la paleta
const AVATAR_COLORS = ["#C9807A", "#9E5550", "#C9A96E", "#D4B8A8", "#2C2420"];

// Reseñas (prueba social)
const RESENAS = [
  {
    inicial: "K",
    nombre: "Karla M.",
    lugar: "Guadalajara",
    color: "#C9807A",
    texto:
      "Compre mi segundo lote de 100 piezas. Calidad increible, mis clientas siempre preguntan de donde saco el maquillaje.",
  },
  {
    inicial: "S",
    nombre: "Sofia R.",
    lugar: "CDMX",
    color: "#9E5550",
    texto:
      "Empece con el lote de 10 y ya voy en mi quinto pedido. El precio por pieza no tiene competencia en Mexico.",
  },
  {
    inicial: "A",
    nombre: "Ana G.",
    lugar: "Monterrey",
    color: "#C9A96E",
    texto:
      "Los lotes siempre vienen con marcas increibles: e.l.f, NYX, Maybelline... mis clientas los adoran y se venden rapido.",
  },
];

// Categorias de maquillaje (refuerzo visual: cada lote trae de todo)
const CATEGORIAS = [
  { emoji: "👁️", nombre: "Ojos", sub: "Sombras · mascaras · delineadores" },
  { emoji: "💋", nombre: "Labios", sub: "Labiales · glosses · liners" },
  { emoji: "✨", nombre: "Rostro", sub: "Bases · rubores · primers" },
];

function ahorroPorLote(l: Lote): number {
  const ppu = l.precio / l.piezas;
  return Math.round((PPU_REFERENCIA - ppu) * l.piezas);
}

export default function Home() {
  const [carrito, setCarrito] = useState<CartItem[]>([]);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [loteActivo, setLoteActivo] = useState<Lote | null>(null);
  const [qtyActual, setQtyActual] = useState(1);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // C.P. (estilo DAX)
  const [cp, setCp] = useState("");
  const [cpConfirmado, setCpConfirmado] = useState("");

  // Cuenta regresiva (urgencia) — termina a medianoche, se calcula en cliente
  const [tiempo, setTiempo] = useState<{ h: string; m: string; s: string } | null>(
    null
  );

  const modalOpen = loteActivo !== null;

  // Cuenta regresiva hasta la medianoche (evita mismatch de hidratacion)
  useEffect(() => {
    function tick() {
      const ahora = new Date();
      const fin = new Date(ahora);
      fin.setHours(24, 0, 0, 0);
      let diff = Math.max(0, Math.floor((fin.getTime() - ahora.getTime()) / 1000));
      const h = Math.floor(diff / 3600);
      diff -= h * 3600;
      const m = Math.floor(diff / 60);
      const s = diff - m * 60;
      const pad = (n: number) => String(n).padStart(2, "0");
      setTiempo({ h: pad(h), m: pad(m), s: pad(s) });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Bloquea el scroll del fondo con carrito o modal abiertos
  useEffect(() => {
    document.body.style.overflow = cartOpen || modalOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [cartOpen, modalOpen]);

  const lotesFiltrados = useMemo(
    () => (filtro === "todos" ? LOTES : LOTES.filter((l) => l.tipo === filtro)),
    [filtro]
  );

  const count = useMemo(
    () => carrito.reduce((acc, it) => acc + it.qty, 0),
    [carrito]
  );
  const total = useMemo(
    () => carrito.reduce((acc, it) => acc + it.precio * it.qty, 0),
    [carrito]
  );

  // Progreso hacia envio gratis
  const faltaEnvioGratis = Math.max(0, ENVIO_GRATIS_DESDE - total);
  const tieneEnvioGratis = total >= ENVIO_GRATIS_DESDE;
  const progresoEnvio = Math.min(100, (total / ENVIO_GRATIS_DESDE) * 100);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3000);
  }

  function confirmarCp(e: React.FormEvent) {
    e.preventDefault();
    if (/^\d{5}$/.test(cp)) {
      setCpConfirmado(cp);
    } else {
      showToast("Ingresa un C.P. valido de 5 digitos");
    }
  }

  function agregarCarrito(id: string, qty: number) {
    const l = LOTES.find((x) => x.id === id);
    if (!l) return;
    setCarrito((prev) => {
      const found = prev.find((it) => it.id === id);
      if (found) {
        return prev.map((it) =>
          it.id === id ? { ...it, qty: it.qty + qty } : it
        );
      }
      return [
        ...prev,
        { id: l.id, nombre: l.nombre, precio: l.precio, foto: l.foto, qty },
      ];
    });
    showToast(l.nombre + " anadido al carrito");
  }

  function quitarItem(id: string) {
    setCarrito((prev) => prev.filter((it) => it.id !== id));
  }

  function cambiarQtyCarrito(id: string, d: number) {
    setCarrito((prev) =>
      prev
        .map((it) =>
          it.id === id ? { ...it, qty: Math.max(0, it.qty + d) } : it
        )
        .filter((it) => it.qty > 0)
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
    agregarCarrito(loteActivo.id, qtyActual);
    closeModal();
  }

  function msgWPP(): string {
    const lines = carrito.map(
      (it) =>
        "- " +
        it.nombre +
        " x" +
        it.qty +
        " = " +
        fmx(it.precio * it.qty) +
        " MXN"
    );
    return (
      "Hola! Quiero hacer el siguiente pedido:\n\n" +
      lines.join("\n") +
      "\n\nTotal: " +
      fmx(total) +
      " MXN\n\nPodria confirmar disponibilidad y datos de pago?"
    );
  }

  function checkoutWPP() {
    if (carrito.length === 0) {
      showToast("Tu carrito esta vacio");
      return;
    }
    window.open(
      "https://wa.me/" + WPP + "?text=" + encodeURIComponent(msgWPP()),
      "_blank"
    );
    setCartOpen(false);
  }

  function checkoutMP() {
    showToast("Mercado Pago se integra en la siguiente fase");
  }

  function pedirWPP() {
    if (!loteActivo) return;
    const l = loteActivo;
    const ppu = (l.precio / l.piezas).toFixed(2);
    const msg =
      "Hola! Quiero pedir:\n\n- " +
      l.nombre +
      " x" +
      qtyActual +
      " = " +
      fmx(l.precio * qtyActual) +
      " MXN ($" +
      ppu +
      "/pieza)" +
      "\n\nPodria confirmar disponibilidad y datos de pago?";
    window.open(
      "https://wa.me/" + WPP + "?text=" + encodeURIComponent(msg),
      "_blank"
    );
    closeModal();
  }

  return (
    <>
      {/* ===== TOP UTILITY BAR — C.P. estilo DAX ===== */}
      <div className="utility">
        <div className="utility-inner">
          <div className="utility-msg">
            🔒 Pago 100% seguro · 🇺🇸 Importado de EE.UU. · 🚚 Envios a toda la
            Republica
          </div>
          {cpConfirmado ? (
            <div className="cp-ok">
              ✓ Envio a <b>C.P. {cpConfirmado}</b> · 48h en CDMX, 2-4 días resto
              <button
                className="cp-btn"
                style={{ marginLeft: 4 }}
                onClick={() => {
                  setCpConfirmado("");
                  setCp("");
                }}
              >
                Cambiar
              </button>
            </div>
          ) : (
            <form className="cp-form" onSubmit={confirmarCp}>
              <label htmlFor="cp">📍 Calcula tu envío:</label>
              <input
                id="cp"
                className="cp-input"
                inputMode="numeric"
                maxLength={5}
                placeholder="Tu C.P."
                value={cp}
                onChange={(e) =>
                  setCp(e.target.value.replace(/\D/g, "").slice(0, 5))
                }
              />
              <button className="cp-btn" type="submit">
                Ver
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ===== OFFER BANNER + COUNTDOWN ===== */}
      <div className="offer">
        <div className="offer-inner">
          <span className="offer-bolt">⚡</span>
          <span className="offer-text">
            <b>OFERTA DE HOY</b> · Envío GRATIS en lotes desde{" "}
            {fmx(ENVIO_GRATIS_DESDE)}
          </span>
          <span className="countdown">
            Termina en
            <span className="cd-box">{tiempo ? tiempo.h : "--"}</span>
            <span className="cd-sep">:</span>
            <span className="cd-box">{tiempo ? tiempo.m : "--"}</span>
            <span className="cd-sep">:</span>
            <span className="cd-box">{tiempo ? tiempo.s : "--"}</span>
          </span>
        </div>
      </div>

      {/* ===== NAV ===== */}
      <nav>
        <div className="nav-inner">
          <div className="nav-logo" onClick={() => window.scrollTo({ top: 0 })}>
            The Makeup Mayoreo<span>CDMX · Importado EE.UU.</span>
          </div>
          <div className="nav-cats">
            <a href="#lotes">Lotes</a>
            <a href="#categorias">Categorías</a>
            <a href="#como-funciona">Cómo funciona</a>
            <a href="#opiniones">Opiniones</a>
          </div>
          <div className="nav-actions">
            <a
              href="https://wa.me/5215543813568?text=Hola!%20Me%20interesa%20un%20lote"
              className="nav-btn wpp"
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp
            </a>
            <button
              className="nav-cart"
              onClick={() => setCartOpen(true)}
              aria-label="Abrir carrito"
            >
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              {count > 0 && <span className="badge">{count}</span>}
            </button>
          </div>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-left">
            <div className="hero-eyebrow">🇺🇸 Importado directamente de EE.UU.</div>
            <h1 className="hero-h1">
              Maquillaje de <em>primera</em> al mejor precio de mayoreo
            </h1>
            <p className="hero-desc">
              Lotes de 10 a 500 piezas de marcas como e.l.f, NYX, Maybelline,
              L&apos;Oreal y mas. Compra barato, revende y gana. Para
              revendedoras de toda Mexico.
            </p>
            <div className="hero-ship">
              🚚 <span>Envío GRATIS</span> en compras mayores a{" "}
              <b>{fmx(ENVIO_GRATIS_DESDE)} MXN</b>
            </div>
            <div className="hero-cta">
              <a href="#lotes" className="btn-primary">
                Ver lotes disponibles →
              </a>
              <a
                href="https://wa.me/5215543813568?text=Hola!%20Quiero%20informacion%20sobre%20los%20lotes"
                className="btn-outline"
                target="_blank"
                rel="noreferrer"
              >
                Preguntar por WhatsApp
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
              src="https://yekvehkmgunoafccwmyp.supabase.co/storage/v1/object/public/lotes-fotos/lote-50-mixto.png"
              alt="Lote de 50 piezas de maquillaje importado de EE.UU."
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
            <span className="trust-ico">🇺🇸</span>
            <div className="trust-txt">
              <b>100% importado</b>
              <span>Producto original de EE.UU.</span>
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
            <b>ENVÍO GRATIS</b> en todas las compras mayores a{" "}
            <b>{fmx(ENVIO_GRATIS_DESDE)} MXN</b>
          </span>
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
            const ahorro = ahorroPorLote(l);
            return (
              <div
                key={l.id}
                className={"lote-card" + (l.popular ? " is-popular" : "")}
                onClick={() => abrirModal(l.id)}
              >
                <div className="lote-card-img">
                  {l.foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.foto} alt={l.nombre} loading="lazy" />
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
                      Ahorras {fmx(ahorro)}
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
                        ✓ Ahorras {fmx(ahorro)} vs. precio menudeo
                      </div>
                    )}
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
                            agregarCarrito(l.id, 1);
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
            <div className="proof-label">Importado de EE.UU.</div>
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

      {/* ===== TESTIMONIOS ===== */}
      <section className="testi-section" id="opiniones">
        <div className="section-header">
          <div className="section-eyebrow">Revendedoras reales</div>
          <h2 className="section-title serif">
            Lo que dicen <em>nuestras clientas</em>
          </h2>
        </div>
        <div className="testi-grid">
          {RESENAS.map((r) => (
            <div className="testi-card" key={r.nombre}>
              <div className="testi-top">
                <div className="testi-avatar" style={{ background: r.color }}>
                  {r.inicial}
                </div>
                <div className="testi-meta">
                  <b>{r.nombre}</b>
                  <span>Revendedora · {r.lugar}</span>
                </div>
              </div>
              <div className="testi-stars">★★★★★</div>
              <p className="testi-text">&quot;{r.texto}&quot;</p>
              <div className="verified">✓ Compra verificada</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== BANNER MAYOREO ===== */}
      <div className="banner-mayoreo">
        <div className="b-eyebrow">Para distribuidoras</div>
        <h2 className="serif">¿Necesitas el lote de 500 piezas?</h2>
        <p>
          El precio por pieza más bajo: $87 MXN. Coordinamos un envío especial y
          atención personalizada para tu negocio.
        </p>
        <a
          href="https://wa.me/5215543813568?text=Hola!%20Me%20interesa%20el%20lote%20de%20500%20piezas%20(%2443%2C500%20MXN).%20Podemos%20coordinar%3F"
          className="banner-btn"
          target="_blank"
          rel="noreferrer"
        >
          Cotizar lote de 500 piezas →
        </a>
      </div>

      {/* ===== FOOTER ===== */}
      <footer>
        <div className="footer-inner">
          <div className="footer-grid">
            <div>
              <div className="footer-brand serif">The Makeup Mayoreo</div>
              <div className="footer-brand-sub">CDMX · Importado EE.UU.</div>
              <p className="footer-desc">
                Maquillaje importado de EE.UU. para revendedoras y consumidoras.
                Marcas: e.l.f, NYX, Maybelline, L&apos;Oreal, Pixi y mas.
              </p>
            </div>
            <div>
              <div className="footer-links-title">Tienda</div>
              <ul className="footer-links">
                <li>
                  <a href="#lotes">Ver lotes disponibles</a>
                </li>
                <li>
                  <a href="#categorias">Categorías</a>
                </li>
                <li>
                  <a href="#como-funciona">Cómo funciona</a>
                </li>
                <li>
                  <a href="#opiniones">Opiniones</a>
                </li>
              </ul>
            </div>
            <div>
              <div className="footer-links-title">Ayuda</div>
              <ul className="footer-links">
                <li>
                  <a
                    href="https://wa.me/5215543813568"
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp
                  </a>
                </li>
                <li>
                  <a href="#">Politica de devoluciones</a>
                </li>
                <li>
                  <a href="#">Terminos y condiciones</a>
                </li>
              </ul>
              <div className="footer-pay">
                <span className="pay-chip">Visa</span>
                <span className="pay-chip">Mastercard</span>
                <span className="pay-chip">Mercado Pago</span>
                <span className="pay-chip">SPEI</span>
                <span className="pay-chip">OXXO</span>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2025 The Makeup Mayoreo CDMX</span>
            <span>🔒 Pagos seguros · Producto importado original</span>
          </div>
        </div>
      </footer>

      {/* ===== WPP FLOAT ===== */}
      <a
        href="https://wa.me/5215543813568?text=Hola!%20Me%20interesa%20un%20lote%20de%20maquillaje"
        className="wpp-float"
        target="_blank"
        rel="noreferrer"
        title="WhatsApp"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.112 1.523 5.84L.057 23.886l6.244-1.437A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.37l-.36-.213-3.71.854.875-3.614-.234-.372A9.818 9.818 0 1112 21.818z" />
        </svg>
      </a>

      {/* ===== CARRITO DRAWER ===== */}
      <div
        className={"cart-overlay" + (cartOpen ? " open" : "")}
        onClick={() => setCartOpen(false)}
      ></div>
      <div className={"cart-drawer" + (cartOpen ? " open" : "")}>
        <div className="cart-header">
          <div className="cart-title serif">Tu carrito</div>
          <button className="cart-close-btn" onClick={() => setCartOpen(false)}>
            ✕
          </button>
        </div>

        {carrito.length > 0 && (
          <div className="fs-progress">
            {tieneEnvioGratis ? (
              <p>🎉 ¡Felicidades! Tienes <b>&nbsp;ENVÍO GRATIS</b></p>
            ) : (
              <p>
                🚚 Te faltan <b>&nbsp;{fmx(faltaEnvioGratis)}&nbsp;</b> para
                envío gratis
              </p>
            )}
            <div className="fs-track">
              <div
                className="fs-fill"
                style={{ width: progresoEnvio + "%" }}
              ></div>
            </div>
          </div>
        )}

        <div className="cart-body">
          {carrito.length === 0 ? (
            <div className="cart-empty">
              <div className="cart-empty-ico">🛍️</div>
              <p>
                Tu carrito esta vacio.
                <br />
                Agrega alguno de nuestros lotes.
              </p>
            </div>
          ) : (
            carrito.map((item) => (
              <div key={item.id} className="cart-item">
                {item.foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.foto} alt={item.nombre} />
                ) : (
                  <div className="cart-item-ph">💄</div>
                )}
                <div>
                  <div className="cart-item-name">{item.nombre}</div>
                  <div className="cart-item-price">{fmx(item.precio)} MXN</div>
                  <div className="qty-ctrl">
                    <button
                      className="qty-btn"
                      onClick={() => cambiarQtyCarrito(item.id, -1)}
                    >
                      -
                    </button>
                    <span className="qty-num">{item.qty}</span>
                    <button
                      className="qty-btn"
                      onClick={() => cambiarQtyCarrito(item.id, 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
                <button
                  className="cart-remove"
                  title="Quitar"
                  onClick={() => quitarItem(item.id)}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        {count > 0 && (
          <div className="cart-footer">
            <div className="cart-total-row">
              <div className="cart-total-label">Total</div>
              <div className="cart-total-val serif">{fmx(total)}</div>
            </div>
            <button className="btn-mp" onClick={checkoutMP}>
              Pagar con Mercado Pago
            </button>
            <button className="btn-wpp-checkout" onClick={checkoutWPP}>
              Pedir por WhatsApp
            </button>
            <p className="cart-note">
              {tieneEnvioGratis
                ? "✓ Envío gratis incluido"
                : "+ envío calculado al confirmar"}
            </p>
          </div>
        )}
      </div>

      {/* ===== MODAL ===== */}
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
                    src={loteActivo.foto}
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
              {ahorroPorLote(loteActivo) > 0 && (
                <div className="modal-save">
                  ✓ Ahorras {fmx(ahorroPorLote(loteActivo))} comprando este lote
                </div>
              )}
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

      <div className={"toast" + (toast ? " show" : "")}>{toast}</div>
    </>
  );
}
