"use client";

import { useEffect, useState } from "react";
import { gaEvent } from "../lib/analytics";
import { imgOpt } from "../lib/img";

const KEY = "amarea_sub_v1"; // marca de "ya suscrito / cerrado"
const POPUP_IMG =
  "https://yekvehkmgunoafccwmyp.supabase.co/storage/v1/object/public/product-photos/sitio/popup-modelo.jpg";

export default function PopupSuscripcion() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<"form" | "loading" | "ok">("form");
  const [codigo, setCodigo] = useState("");
  const [msg, setMsg] = useState("");
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY)) return; // ya se suscribió o lo cerró
    } catch {}
    // Nunca encima de alguien que esta a punto de pagar. En /cotizacion el
    // pop-up tapaba el boton de pagar y ademas ofrecia un 10% que NO aplica a
    // lotes: justo en el momento del pago sembraba la duda de "a lo mejor me
    // conviene esperar", y esa clienta ya no volvia.
    if (typeof window !== "undefined") {
      const ruta = window.location.pathname;
      if (
        ruta.startsWith("/checkout") ||
        ruta.startsWith("/cotizacion") ||
        ruta.startsWith("/opinar")
      )
        return;
    }

    let abierto = false;
    const abrir = () => {
      if (abierto) return;
      abierto = true;
      setShow(true);
    };
    const t = setTimeout(abrir, 15000);
    const onLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) abrir();
    };
    document.addEventListener("mouseleave", onLeave);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  function cerrar() {
    setShow(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setMsg("Escribe un correo válido.");
      return;
    }
    setMsg("");
    setEstado("loading");
    try {
      const res = await fetch("/api/suscribir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ via: "email", email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setEstado("form");
        setMsg(data.error || "No se pudo. Intenta de nuevo.");
        return;
      }
      setCodigo(data.codigo || "BIENVENIDA10");
      setEstado("ok");
      try {
        localStorage.setItem(KEY, "1");
      } catch {}
      gaEvent("suscripcion", { fuente: "popup", via: "email" });
    } catch {
      setEstado("form");
      setMsg("Error de conexión. Intenta de nuevo.");
    }
  }

  function copiar() {
    try {
      navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {}
  }

  if (!show) return null;

  return (
    <div className="pu-overlay" onClick={cerrar}>
      <div className="pu-card" onClick={(e) => e.stopPropagation()}>
        <div
          className="pu-photo"
          style={{ backgroundImage: `url(${imgOpt(POPUP_IMG, 800) ?? POPUP_IMG})` }}
        />
        <div className="pu-grad" />
        <button className="pu-close" onClick={cerrar} aria-label="Cerrar">
          ✕
        </button>

        <div className="pu-content">
          <div className="pu-logo serif">
            AMARÉA<span>MÉXICO</span>
          </div>

          {estado !== "ok" ? (
            <div className="pu-bottom">
              <h3 className="pu-tit serif">Bienvenida a Amaréa ♡</h3>
              <p className="pu-sub">
                Sé la primera en enterarte de nuevos lanzamientos, promociones
                exclusivas y mucho más.
              </p>
              <div className="pu-divider">
                <span>✦</span>
              </div>
              <div className="pu-kicker">Regístrate y recibe</div>
              <div className="pu-off serif">
                10<span className="pu-off-pct">%</span> OFF
              </div>
              <div className="pu-off-sub">en tu primera compra</div>

              <form onSubmit={enviar} className="pu-form">
                <label className="pu-input">
                  <span className="pu-input-ico">✉️</span>
                  <input
                    type="email"
                    placeholder="Tu correo electrónico"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                {msg && <div className="pu-msg">{msg}</div>}
                <button
                  type="submit"
                  className="pu-btn"
                  disabled={estado === "loading"}
                >
                  {estado === "loading" ? "Enviando…" : "QUIERO MI 10% OFF →"}
                </button>
              </form>

              <div className="pu-badges">
                <span>🚚 Envíos rápidos a todo México</span>
                <span>🔒 Compra segura y protegida</span>
              </div>
              <p className="pu-fine">
                Al registrarte, aceptas recibir correos con novedades y
                promociones exclusivas.
              </p>
            </div>
          ) : (
            <div className="pu-bottom pu-bottom-ok">
              <div className="pu-off serif" style={{ fontSize: 40 }}>
                🎉
              </div>
              <h3 className="pu-tit serif">¡Listo!</h3>
              <p className="pu-sub">
                Usa este código al pagar y obtén <b>10% de descuento</b> en tu
                primera compra de productos individuales:
              </p>
              <button className="pu-code" onClick={copiar} title="Toca para copiar">
                {codigo} <span>{copiado ? "✓ copiado" : "copiar"}</span>
              </button>
              <a href="/amarea" className="pu-btn" style={{ textDecoration: "none" }}>
                Ir a comprar →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
