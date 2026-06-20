"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "../lib/cart";
import { ENVIO_GRATIS_DESDE, fmx } from "../lib/lotes";

type Variante = "landing" | "mayoreo" | "amarea";

export default function SiteHeader({
  variant = "mayoreo",
}: {
  variant?: Variante;
}) {
  const { count, openCart, showToast } = useCart();

  // Identidad y navegación según la sección
  const esAmarea = variant === "amarea";
  const logoHref =
    variant === "amarea" ? "/amarea" : variant === "mayoreo" ? "/mayoreo" : "/";
  const logoNombre = esAmarea ? "AMAREA" : "The Makeup Mayoreo";
  const logoSub = esAmarea ? "Belleza por pieza" : null;

  // C.P. (estilo DAX)
  const [cp, setCp] = useState("");
  const [cpConfirmado, setCpConfirmado] = useState("");

  // Cuenta regresiva hasta medianoche (urgencia)
  const [tiempo, setTiempo] = useState<{ h: string; m: string; s: string } | null>(
    null
  );
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

  function confirmarCp(e: React.FormEvent) {
    e.preventDefault();
    if (/^\d{5}$/.test(cp)) setCpConfirmado(cp);
    else showToast("Ingresa un C.P. válido de 5 dígitos");
  }

  return (
    <>
      {/* TOP UTILITY BAR — C.P. estilo DAX */}
      <div className="utility">
        <div className="utility-inner">
          <div className="utility-msg">
            🔒 Pago 100% seguro · 💄 Tus marcas favoritas · 🚚 Envíos a toda la
            República
          </div>
          {cpConfirmado ? (
            <div className="cp-ok">
              ✓ Envío a <b>C.P. {cpConfirmado}</b> · 48h en CDMX, 2-4 días resto
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

      {/* OFFER BANNER + COUNTDOWN */}
      <div className="offer">
        <div className="offer-inner">
          <span className="offer-bolt">⚡</span>
          <span className="offer-text">
            <b>OFERTA DE HOY</b> · Envío GRATIS en compras desde{" "}
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

      {/* NAV */}
      <nav>
        <div className="nav-inner">
          <Link
            href={logoHref}
            className={"nav-logo" + (esAmarea ? " nav-logo-amarea" : "")}
          >
            {logoNombre}
            {logoSub && <span>{logoSub}</span>}
          </Link>
          <div className="nav-cats">
            {variant === "amarea" ? (
              <>
                <Link href="/amarea">Productos</Link>
                <Link href="/amarea#categorias">Categorías</Link>
                <Link href="/mayoreo">Mayoreo · Lotes</Link>
              </>
            ) : variant === "mayoreo" ? (
              <>
                <Link href="/mayoreo#lotes">Lotes</Link>
                <Link href="/amarea" className="nav-amarea">
                  AMAREA · Productos
                </Link>
                <Link href="/mayoreo#como-funciona">Cómo funciona</Link>
                <Link href="/mayoreo#opiniones">Opiniones</Link>
              </>
            ) : (
              <>
                <Link href="/mayoreo">Mayoreo · Lotes</Link>
                <Link href="/amarea" className="nav-amarea">
                  AMAREA · Productos
                </Link>
              </>
            )}
          </div>
          <div className="nav-actions">
            <a
              href="https://wa.me/5215543813568?text=Hola!%20Me%20interesa%20un%20producto"
              className="nav-btn wpp"
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp
            </a>
            <button
              className="nav-cart"
              onClick={openCart}
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
    </>
  );
}
