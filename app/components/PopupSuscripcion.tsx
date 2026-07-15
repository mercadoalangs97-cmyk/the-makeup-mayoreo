"use client";

import { useEffect, useState } from "react";
import { gaEvent } from "../lib/analytics";

const KEY = "amarea_sub_v1"; // marca de "ya suscrito / cerrado"

export default function PopupSuscripcion() {
  const [show, setShow] = useState(false);
  const [via, setVia] = useState<"whatsapp" | "email">("whatsapp");
  const [nombre, setNombre] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<"form" | "loading" | "ok">("form");
  const [codigo, setCodigo] = useState("");
  const [msg, setMsg] = useState("");
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY)) return; // ya se suscribió o lo cerró
    } catch {}
    // No molestar durante el pago
    if (
      typeof window !== "undefined" &&
      window.location.pathname.startsWith("/checkout")
    )
      return;

    let abierto = false;
    const abrir = () => {
      if (abierto) return;
      abierto = true;
      setShow(true);
    };
    // Aparece a los 15 s, o si el cursor sale por arriba (intención de irse).
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
    if (nombre.trim().length < 2) {
      setMsg("Escribe tu nombre.");
      return;
    }
    const w = whatsapp.replace(/\D/g, "");
    if (via === "whatsapp" && w.length !== 10) {
      setMsg("Escribe tu WhatsApp a 10 dígitos.");
      return;
    }
    if (via === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setMsg("Escribe un correo válido.");
      return;
    }
    setMsg("");
    setEstado("loading");
    try {
      const res = await fetch("/api/suscribir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ via, whatsapp: w, email: email.trim(), nombre }),
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
      gaEvent("suscripcion", { fuente: "popup", via });
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
    <div className="sub-overlay" onClick={cerrar}>
      <div className="sub-card" onClick={(e) => e.stopPropagation()}>
        <button className="sub-close" onClick={cerrar} aria-label="Cerrar">
          ✕
        </button>
        {estado !== "ok" ? (
          <>
            <div className="sub-emoji">💄</div>
            <h3 className="sub-tit serif">10% en tu primera compra</h3>
            <p className="sub-sub">
              Déjanos tu contacto y te damos un código de bienvenida para tu
              primer maquillaje. Además te avisamos de novedades y promos. 💌
            </p>
            <div className="sub-toggle" role="tablist">
              <button
                type="button"
                className={via === "whatsapp" ? "active" : ""}
                onClick={() => {
                  setVia("whatsapp");
                  setMsg("");
                }}
              >
                📱 WhatsApp
              </button>
              <button
                type="button"
                className={via === "email" ? "active" : ""}
                onClick={() => {
                  setVia("email");
                  setMsg("");
                }}
              >
                ✉️ Correo
              </button>
            </div>
            <form onSubmit={enviar} className="sub-form">
              <input
                placeholder="Tu nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
              {via === "whatsapp" ? (
                <input
                  placeholder="WhatsApp (10 dígitos)"
                  inputMode="numeric"
                  maxLength={10}
                  value={whatsapp}
                  onChange={(e) =>
                    setWhatsapp(e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                />
              ) : (
                <input
                  placeholder="tucorreo@ejemplo.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              )}
              {msg && <div className="sub-msg">{msg}</div>}
              <button type="submit" className="sub-btn" disabled={estado === "loading"}>
                {estado === "loading" ? "Enviando…" : "Quiero mi 10%"}
              </button>
            </form>
            <p className="sub-fine">Sin spam. Puedes darte de baja cuando quieras.</p>
          </>
        ) : (
          <>
            <div className="sub-emoji">🎉</div>
            <h3 className="sub-tit serif">
              ¡Listo{nombre ? `, ${nombre.trim().split(" ")[0]}` : ""}!
            </h3>
            <p className="sub-sub">
              Usa este código al pagar y obtén <b>10% de descuento</b> en
              productos individuales:
            </p>
            <button className="sub-code" onClick={copiar} title="Toca para copiar">
              {codigo} <span>{copiado ? "✓ copiado" : "copiar"}</span>
            </button>
            <a href="/amarea" className="sub-btn sub-btn-link">
              Ir a comprar
            </a>
          </>
        )}
      </div>
    </div>
  );
}
