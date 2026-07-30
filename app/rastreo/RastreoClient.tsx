"use client";

import { useState } from "react";
import Link from "next/link";
import { fmx } from "../lib/lotes";

type Estado = {
  pedido: string;
  etapa: number;
  texto: string;
  total: number;
  piezas: number;
  fecha: number;
  enviado_en: number | null;
  guia: string | null;
  guia_url: string | null;
  paqueteria: string | null;
};

const PASOS = ["Recibido", "Pagado", "Preparado", "En camino"];

export default function RastreoClient() {
  const [pedido, setPedido] = useState("");
  const [email, setEmail] = useState("");
  const [cargando, setCargando] = useState(false);
  const [msg, setMsg] = useState("");
  const [r, setR] = useState<Estado | null>(null);

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setR(null);
    setCargando(true);
    try {
      const res = await fetch("/api/rastreo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedido, email }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) setMsg(data.error || "No se pudo consultar.");
      else setR(data as Estado);
    } catch {
      setMsg("Error de conexión. Intenta de nuevo.");
    }
    setCargando(false);
  }

  const fecha = (ms: number | null) =>
    ms
      ? new Date(Number(ms)).toLocaleDateString("es-MX", {
          day: "2-digit",
          month: "long",
        })
      : "";

  return (
    <>
      <form onSubmit={buscar} className="ras-form">
        <label className="co-field">
          <span>Número de pedido</span>
          <input
            value={pedido}
            placeholder="Ej. A1B2C3D4"
            onChange={(e) => setPedido(e.target.value)}
          />
          <small className="co-cp-msg">Viene en tu correo de confirmación.</small>
        </label>
        <label className="co-field">
          <span>Correo con el que compraste</span>
          <input
            type="email"
            value={email}
            placeholder="tucorreo@ejemplo.com"
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <button className="btn-primary ras-btn" disabled={cargando}>
          {cargando ? "Buscando…" : "Ver mi pedido"}
        </button>
        {msg && <div className="co-error">{msg}</div>}
      </form>

      {r && (
        <div className="ras-result">
          <div className="ras-head">
            <div>
              <div className="ras-num">Pedido #{r.pedido}</div>
              <div className="ras-fecha">{fecha(r.fecha)}</div>
            </div>
            <div className="ras-total serif">{fmx(r.total)}</div>
          </div>

          <ol className="ras-pasos">
            {PASOS.map((p, i) => (
              <li key={p} className={i + 1 <= r.etapa ? "ok" : ""}>
                <span>{i + 1 <= r.etapa ? "✓" : i + 1}</span>
                {p}
              </li>
            ))}
          </ol>

          <p className="ras-texto">{r.texto}</p>

          {r.guia && (
            <div className="ras-guia">
              <div>
                <small>Paquetería</small>
                <b>{r.paqueteria || "Estafeta"}</b>
              </div>
              <div>
                <small>Número de guía</small>
                <b className="ras-mono">{r.guia}</b>
              </div>
              {r.guia_url && (
                <a
                  href={r.guia_url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary ras-track"
                >
                  📍 Rastrear en la paquetería
                </a>
              )}
            </div>
          )}

          <p className="ras-ayuda">
            ¿Algo no cuadra?{" "}
            <Link href="/contacto">Escríbenos y lo revisamos</Link>.
          </p>
        </div>
      )}
    </>
  );
}
