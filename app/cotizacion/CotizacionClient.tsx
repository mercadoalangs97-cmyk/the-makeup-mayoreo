"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LOTES, fmx, PPU_REFERENCIA, WPP } from "../lib/lotes";
import { useCart } from "../lib/cart";
import { imgOpt } from "../lib/img";
import { gaLead } from "../lib/analytics";
import { NEGOCIO, NEGOCIO_DIR } from "../lib/site";

export default function CotizacionClient({
  loteId,
  qty,
  nombre,
}: {
  loteId: string;
  qty: number;
  nombre: string;
}) {
  const { add, clear, hydrated } = useCart();
  const router = useRouter();
  const [yendo, setYendo] = useState(false);

  const lote = LOTES.find((l) => l.id === loteId);

  useEffect(() => {
    // Marca la apertura de la cotización para saber cuántas se ven vs se pagan.
    if (lote) gaLead("cotizacion_abierta_" + lote.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loteId]);

  if (!lote) {
    return (
      <div className="cot-error">
        <p>No encontramos esa cotización. Escríbenos y te la reenviamos.</p>
        <a
          className="btn-primary"
          href={`https://wa.me/${WPP}`}
          target="_blank"
          rel="noreferrer"
        >
          Escribir por WhatsApp
        </a>
      </div>
    );
  }

  const total = lote.precio * qty;
  const piezas = lote.piezas * qty;
  const ppu = lote.precio / lote.piezas;
  const ventaEstimada = PPU_REFERENCIA * piezas;
  const ganancia = Math.max(0, ventaEstimada - total);

  function pagar() {
    if (!hydrated || yendo) return;
    setYendo(true);
    clear(); // la cotización manda: empezamos limpio
    add(
      {
        id: "lote:" + lote!.id,
        tipo: "lote",
        nombre: lote!.nombre,
        precio: lote!.precio,
        foto: lote!.foto,
        sub: lote!.piezas + " piezas",
      },
      qty
    );
    router.push("/checkout");
  }

  return (
    <div className="cot-wrap">
      <div className="cot-card">
        <div className="cot-head">
          <span className="cot-eyebrow">Cotización</span>
          <h1 className="serif cot-h1">
            {nombre ? `Hola ${nombre}, esto es lo tuyo` : "Tu cotización"}
          </h1>
          <p className="cot-sub">
            Preparada por {NEGOCIO.nombre}. Puedes pagar aquí mismo de forma
            segura.
          </p>
        </div>

        <div className="cot-lote">
          {lote.foto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgOpt(lote.foto, 260)}
              alt={lote.nombre}
              width={130}
              height={130}
            />
          ) : (
            <div className="cot-ph">📦</div>
          )}
          <div className="cot-lote-info">
            <b>{lote.nombre}</b>
            <span>
              {piezas} piezas surtidas · ${ppu.toFixed(0)} por pieza
            </span>
            <span className="cot-marcas">
              e.l.f · NYX · Maybelline · L&apos;Oréal · Pixi
            </span>
            {qty > 1 && <span className="cot-qty">{qty} lotes</span>}
          </div>
        </div>

        <div className="cot-total">
          <span>Total de tu lote</span>
          <b className="serif">{fmx(total)}</b>
        </div>
        <p className="cot-envio">
          + envío por Estafeta (aprox. $137 a $250 según tu C.P.). Lo calculamos
          exacto en el siguiente paso, antes de que pagues.
        </p>

        {ganancia > 0 && (
          <div className="cot-ganancia">
            <div className="cot-g-tit">💰 Lo que puedes ganar</div>
            <div className="cot-g-row">
              <span>Inviertes</span>
              <b>{fmx(total)}</b>
            </div>
            <div className="cot-g-row">
              <span>
                Vendes {piezas} pzas a ${PPU_REFERENCIA}
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

        <button className="cot-btn" onClick={pagar} disabled={yendo}>
          {yendo ? "Preparando tu pago…" : "Pagar de forma segura →"}
        </button>

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
          <div>
            <b>Somos un negocio real</b>
            <span>{NEGOCIO_DIR}</span>
          </div>
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
