"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fmx, PPU_REFERENCIA, WPP } from "../../lib/lotes";
import { imgOpt } from "../../lib/img";
import { gaLead } from "../../lib/analytics";
import { NEGOCIO } from "../../lib/site";

export type CotData = {
  id: string;
  nombre: string;
  loteNombre: string;
  loteFoto: string | null;
  piezas: number;
  qty: number;
  ppu: number;
  subtotal: number;
  envioCosto: number;
  envioPaqueteria: string;
  envioDias: number | null;
  total: number;
  ciudad: string;
  estado: string;
  cp: string;
  pagada: boolean;
  yaTiene: {
    nombre: string;
    telefono: string;
    email: string;
    calle: string;
    numero: string;
    colonia: string;
    referencias: string;
  };
};

export default function CotizacionPago({ c }: { c: CotData }) {
  const [yendo, setYendo] = useState(false);
  const [err, setErr] = useState("");
  const [datos, setDatos] = useState(c.yaTiene);
  // Si la cotización se armó solo con el C.P., aquí completa lo que falta.
  const faltaDireccion =
    !c.yaTiene.calle ||
    !c.yaTiene.numero ||
    !c.yaTiene.colonia ||
    !c.yaTiene.nombre ||
    c.yaTiene.telefono.replace(/\D/g, "").length !== 10;
  const set = (k: keyof typeof datos) => (v: string) =>
    setDatos((d) => ({ ...d, [k]: v }));

  // Avisa que la clienta abrió su cotización, para saber si el problema está
  // en que no abren el link o en que lo abren y no pagan. Best-effort.
  useEffect(() => {
    gaLead("cotizacion_abierta_" + c.id);
    fetch("/api/cotizacion/visto", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: c.id }),
      keepalive: true,
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.id]);

  const ventaEstimada = PPU_REFERENCIA * c.piezas;
  const ganancia = Math.max(0, ventaEstimada - c.subtotal);

  async function pagar() {
    if (yendo) return;
    setYendo(true);
    setErr("");
    gaLead("cotizacion_pagar_" + c.id);
    try {
      const res = await fetch("/api/cotizacion/pagar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c.id, datos }),
      });
      const data = await res.json();
      if (!res.ok || !data.init_point) {
        setErr(data.error || "No se pudo abrir el pago. Intenta de nuevo.");
        setYendo(false);
        return;
      }
      try {
        sessionStorage.setItem(
          "amarea_ga_purchase",
          JSON.stringify({
            id: data.orden_id || "",
            value: c.total,
            items: [
              {
                item_id: "lote",
                item_name: c.loteNombre,
                price: c.subtotal,
                quantity: c.qty,
              },
            ],
          })
        );
      } catch {}
      window.location.href = data.init_point;
    } catch {
      setErr("Error de conexión. Revisa tu internet e intenta de nuevo.");
      setYendo(false);
    }
  }

  return (
    <div className="cot-wrap">
      <div className="cot-card">
        <div className="cot-head">
          <span className="cot-eyebrow">Cotización {c.id}</span>
          <h1 className="serif cot-h1">
            {c.nombre ? `Hola ${c.nombre}, esto es lo tuyo` : "Tu cotización"}
          </h1>
          <p className="cot-sub">
            {faltaDireccion
              ? "Tu envío ya está cotizado con tu código postal. Solo falta a dónde te lo mandamos."
              : "Ya está todo listo: solo elige cómo pagar. No tienes que llenar ningún formulario."}
          </p>
        </div>

        <div className="cot-lote">
          {c.loteFoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imgOpt(c.loteFoto, 260)} alt={c.loteNombre} width={130} height={130} />
          ) : (
            <div className="cot-ph">📦</div>
          )}
          <div className="cot-lote-info">
            <b>{c.loteNombre}</b>
            <span>
              {c.piezas} piezas surtidas · ${c.ppu.toFixed(0)} por pieza
            </span>
            <span className="cot-marcas">
              e.l.f · NYX · Maybelline · L&apos;Oréal · Pixi
            </span>
            {c.qty > 1 && <span className="cot-qty">{c.qty} lotes</span>}
          </div>
        </div>

        {/* Desglose con el envío YA calculado */}
        <div className="cot-desglose">
          <div className="cot-d-row">
            <span>Tu lote</span>
            <b>{fmx(c.subtotal)}</b>
          </div>
          <div className="cot-d-row">
            <span>
              Envío{c.envioPaqueteria ? ` · ${c.envioPaqueteria}` : ""}
              {c.ciudad ? ` a ${c.ciudad}` : ""}
              {c.envioDias != null ? ` (${c.envioDias} días hábiles)` : ""}
            </span>
            <b>{c.envioCosto > 0 ? fmx(c.envioCosto) : "Por confirmar"}</b>
          </div>
          <div className="cot-d-row cot-d-total">
            <span>Total a pagar</span>
            <b className="serif">{fmx(c.total)}</b>
          </div>
        </div>

        {ganancia > 0 && (
          <div className="cot-ganancia">
            <div className="cot-g-tit">💰 Lo que puedes ganar</div>
            <div className="cot-g-row">
              <span>Inviertes</span>
              <b>{fmx(c.subtotal)}</b>
            </div>
            <div className="cot-g-row">
              <span>
                Vendes {c.piezas} pzas a ${PPU_REFERENCIA}
              </span>
              <b>{fmx(ventaEstimada)}</b>
            </div>
            <div className="cot-g-row cot-g-total">
              <span>Tu ganancia</span>
              <b>{fmx(ganancia)}</b>
            </div>
            <p className="cot-g-nota">
              Estimado con el precio promedio de tienda. Tu ganancia real depende
              del precio al que vendas.
            </p>
          </div>
        )}

        {!c.pagada && faltaDireccion && (
          <div className="cot-form">
            <div className="cot-form-tit">📍 ¿A dónde te lo enviamos?</div>
            <p className="cot-form-sub">
              El costo del envío ya no cambia — lo calculamos con tu C.P.{" "}
              {c.cp && <b>{c.cp}</b>}
              {c.ciudad ? `, ${c.ciudad}` : ""}.
            </p>

            <label className="cot-lb" htmlFor="f-nombre">
              Tu nombre completo
            </label>
            <input
              id="f-nombre"
              className="cot-in"
              value={datos.nombre}
              onChange={(e) => set("nombre")(e.target.value)}
              placeholder="Karla Martínez"
              autoComplete="name"
            />

            <div className="cot-row">
              <div>
                <label className="cot-lb" htmlFor="f-calle">
                  Calle
                </label>
                <input
                  id="f-calle"
                  className="cot-in"
                  value={datos.calle}
                  onChange={(e) => set("calle")(e.target.value)}
                  placeholder="Av. Juárez"
                  autoComplete="address-line1"
                />
              </div>
              <div className="cot-col-chica">
                <label className="cot-lb" htmlFor="f-num">
                  Número
                </label>
                <input
                  id="f-num"
                  className="cot-in"
                  value={datos.numero}
                  onChange={(e) => set("numero")(e.target.value)}
                  placeholder="123 int 4"
                />
              </div>
            </div>

            <label className="cot-lb" htmlFor="f-col">
              Colonia
            </label>
            <input
              id="f-col"
              className="cot-in"
              value={datos.colonia}
              onChange={(e) => set("colonia")(e.target.value)}
              placeholder="Centro"
              autoComplete="address-level3"
            />

            <label className="cot-lb" htmlFor="f-tel">
              Teléfono (para la paquetería)
            </label>
            <input
              id="f-tel"
              className="cot-in"
              value={datos.telefono}
              onChange={(e) =>
                set("telefono")(e.target.value.replace(/\D/g, "").slice(0, 10))
              }
              placeholder="5512345678"
              inputMode="numeric"
              autoComplete="tel"
            />

            <label className="cot-lb" htmlFor="f-mail">
              Correo <span className="cot-opt">(para tu comprobante y rastreo)</span>
            </label>
            <input
              id="f-mail"
              className="cot-in"
              value={datos.email}
              onChange={(e) => set("email")(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              type="email"
              autoComplete="email"
            />

            <label className="cot-lb" htmlFor="f-ref">
              Referencias <span className="cot-opt">(opcional)</span>
            </label>
            <input
              id="f-ref"
              className="cot-in"
              value={datos.referencias}
              onChange={(e) => set("referencias")(e.target.value)}
              placeholder="Casa blanca, portón negro"
            />
          </div>
        )}

        {c.pagada ? (
          <div className="cot-pagada">
            ✓ Esta cotización ya fue pagada. ¡Gracias por tu compra!
          </div>
        ) : (
          <>
            <button className="cot-btn" onClick={pagar} disabled={yendo}>
              {yendo ? "Abriendo el pago…" : `Pagar ${fmx(c.total)} →`}
            </button>
            {err && <div className="co-error" style={{ marginTop: 10 }}>{err}</div>}
          </>
        )}

        <div className="cot-pagos">
          <span>💳 Tarjeta (a meses)</span>
          <span>🏦 Transferencia SPEI</span>
          <span>🏪 Efectivo en OXXO</span>
        </div>
        <p className="cot-mp">
          El cobro lo procesa <b>Mercado Pago</b>. Nosotros nunca vemos los datos
          de tu tarjeta y tu compra queda protegida por la plataforma.
        </p>

        <div className="cot-conf">
          <div className="cot-conf-links">
            <a href={`https://wa.me/${WPP}`} target="_blank" rel="noreferrer">
              📱 {NEGOCIO.telefono}
            </a>
            <Link href="/nosotros">Quiénes somos</Link>
            <Link href="/devoluciones">Garantía</Link>
            <Link href="/rastreo">Rastreo de pedidos</Link>
          </div>
        </div>
      </div>

      <p className="cot-dudas">
        ¿Alguna duda antes de pagar?{" "}
        <a href={`https://wa.me/${WPP}`} target="_blank" rel="noreferrer">
          Escríbenos por WhatsApp
        </a>
      </p>
    </div>
  );
}
