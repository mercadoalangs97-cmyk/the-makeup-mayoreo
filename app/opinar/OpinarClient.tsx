"use client";

import { useState } from "react";
import { WPP } from "../lib/lotes";
import { gaLead } from "../lib/analytics";

const ESTRELLAS = [1, 2, 3, 4, 5];

export default function OpinarClient({
  pedido,
  nombre: nombreInicial,
}: {
  pedido: string;
  nombre: string;
}) {
  const [nombre, setNombre] = useState(nombreInicial);
  const [ciudad, setCiudad] = useState("");
  const [calificacion, setCalificacion] = useState(0);
  const [texto, setTexto] = useState("");
  const [autoriza, setAutoriza] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [err, setErr] = useState("");
  const [listo, setListo] = useState(false);

  async function enviar() {
    if (enviando) return;
    setErr("");
    if (nombre.trim().length < 2) return setErr("Escribe tu nombre.");
    if (!calificacion) return setErr("Elige cuántas estrellas nos das.");
    if (texto.trim().length < 10)
      return setErr("Cuéntanos aunque sea una frase.");
    setEnviando(true);
    try {
      const res = await fetch("/api/opinar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          ciudad,
          calificacion,
          texto,
          autoriza,
          pedido,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErr(data.error || "No se pudo enviar. Intenta de nuevo.");
        setEnviando(false);
        return;
      }
      gaLead("opinion_enviada_" + calificacion);
      setListo(true);
    } catch {
      setErr("Error de conexión. Revisa tu internet.");
      setEnviando(false);
    }
  }

  if (listo) {
    return (
      <div className="op-wrap">
        <div className="op-card op-gracias">
          <div className="op-check">💗</div>
          <h1 className="serif op-h1">¡Gracias, {nombre.split(" ")[0]}!</h1>
          <p className="op-sub">
            De verdad nos ayuda muchísimo. Somos un negocio pequeño y cada
            opinión hace que otra chica se anime a confiar en nosotras.
          </p>
          {calificacion <= 3 && (
            <p className="op-sub">
              Vimos que algo no salió como esperabas. Escríbenos y lo
              resolvemos: no queremos dejarte así.
            </p>
          )}
          <a
            className="op-btn op-btn-wpp"
            href={`https://wa.me/${WPP}`}
            target="_blank"
            rel="noreferrer"
          >
            Escribirnos por WhatsApp
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="op-wrap">
      <div className="op-card">
        <span className="op-eyebrow">Tu opinión</span>
        <h1 className="serif op-h1">
          {nombreInicial
            ? `${nombreInicial.split(" ")[0]}, ¿cómo te fue?`
            : "¿Cómo te fue con tu pedido?"}
        </h1>
        <p className="op-sub">
          Nos toma menos de un minuto y nos ayuda más de lo que imaginas.
        </p>

        <label className="op-label">¿Cuántas estrellas nos das?</label>
        <div className="op-stars" role="radiogroup" aria-label="Calificación">
          {ESTRELLAS.map((n) => (
            <button
              key={n}
              type="button"
              className={"op-star" + (n <= calificacion ? " on" : "")}
              onClick={() => setCalificacion(n)}
              aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
              aria-pressed={n <= calificacion}
            >
              ★
            </button>
          ))}
        </div>

        <label className="op-label" htmlFor="op-nombre">
          Tu nombre
        </label>
        <input
          id="op-nombre"
          className="op-input"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Karla M."
          maxLength={60}
        />

        <label className="op-label" htmlFor="op-ciudad">
          Ciudad (opcional)
        </label>
        <input
          id="op-ciudad"
          className="op-input"
          value={ciudad}
          onChange={(e) => setCiudad(e.target.value)}
          placeholder="Puebla"
          maxLength={60}
        />

        <label className="op-label" htmlFor="op-texto">
          ¿Qué te pareció?
        </label>
        <textarea
          id="op-texto"
          className="op-input op-textarea"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Cómo llegó tu pedido, qué tal los productos, si ya empezaste a vender…"
          maxLength={1200}
        />

        <label className="op-check-row">
          <input
            type="checkbox"
            checked={autoriza}
            onChange={(e) => setAutoriza(e.target.checked)}
          />
          <span>
            Autorizo que publiquen mi opinión con mi nombre de pila y mi ciudad.
          </span>
        </label>

        {err && <div className="op-err">{err}</div>}

        <button className="op-btn" onClick={enviar} disabled={enviando}>
          {enviando ? "Enviando…" : "Enviar mi opinión"}
        </button>
      </div>
    </div>
  );
}
