"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LOTES, fmx, PPU_REFERENCIA, WPP } from "../../lib/lotes";
import { imgOpt } from "../../lib/img";
import { gaLead } from "../../lib/analytics";
import { NEGOCIO } from "../../lib/site";
import { DATOS_BANCARIOS, clabeLegible } from "../../lib/pago";

export type CotData = {
  id: string;
  nombre: string;
  loteId: string;
  loteNombre: string;
  loteFoto: string | null;
  piezas: number;
  qty: number;
  ppu: number;
  subtotal: number;
  lineas: {
    nombre: string;
    qty: number;
    importe: number;
    esLote: boolean;
    descripcion?: string | null;
  }[];
  descuento: number;
  descuentoPct: number | null;
  envioCosto: number;
  envioPaqueteria: string;
  envioDias: number | null;
  total: number;
  ciudad: string;
  estado: string;
  cp: string;
  pagada: boolean;
  /** Anticipo ya pagado para apartar. 0 = no ha apartado. */
  apartado: number;
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
  // El link se manda por WhatsApp, asi que muchas clientas lo abren DENTRO de
  // WhatsApp. Ese navegador embebido tumba el checkout de Mercado Pago a la
  // mitad ("me saco"), y es la causa mas probable de que 2 de cada 3 intentos
  // de pago no lleguen a completarse.
  const [enApp, setEnApp] = useState(false);
  const [copiado, setCopiado] = useState(false);
  // Segunda vía de pago. No compite con Mercado Pago: aparece para quien no
  // logró pagar ahí, que es la mayoría (solo 1 de cada 3 lo completa).
  const [verSpei, setVerSpei] = useState(false);
  const [avisando, setAvisando] = useState(false);
  const [aviso, setAviso] = useState(false);
  const [copiadoQue, setCopiadoQue] = useState("");
  const copiar = async (texto: string, que: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiadoQue(que);
      setTimeout(() => setCopiadoQue(""), 2500);
    } catch {}
  };
  async function avisarTransferencia() {
    if (avisando || aviso) return;
    setAvisando(true);
    gaLead("cotizacion_spei_" + c.id);
    try {
      await fetch("/api/cotizacion/transferencia-aviso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c.id, nombre: datos.nombre }),
      });
      setAviso(true);
    } catch {
      setAviso(true); // igual le decimos que nos escriba por WhatsApp
    }
    setAvisando(false);
  }
  useEffect(() => {
    try {
      const ua = navigator.userAgent || "";
      setEnApp(
        /FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|WhatsApp/i.test(ua) ||
          // WebView de Android sin marca propia
          (/\bwv\b/i.test(ua) && /Android/i.test(ua))
      );
    } catch {}
  }, []);
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

  // Solo tiene sentido para las piezas de LOTE (lo que se revende).
  const ventaEstimada = PPU_REFERENCIA * c.piezas;
  const pagaPorElLote = c.subtotal - c.descuento;
  const ganancia = Math.max(0, ventaEstimada - pagaPorElLote);

  // ---- Siguiente escalón de lote ----
  // La mayoría cotiza el lote más chico, donde el margen apenas paga la
  // publicidad. Le mostramos el siguiente tamaño que de verdad le baja el
  // precio por pieza (al menos $4), no el que sigue en la lista: hay lotes
  // que cuestan MÁS por pieza que uno más chico y sería venderle peor.
  const loteActual = LOTES.find((l) => l.id === c.loteId);
  const esMixto = (id: string) => id.startsWith("mixto-");
  const ppuActual = loteActual ? loteActual.precio / loteActual.piezas : 0;
  const siguiente =
    c.qty === 1 && !c.pagada && c.descuento === 0 && loteActual && esMixto(loteActual.id)
      ? LOTES.filter(
          (l) =>
            esMixto(l.id) &&
            l.piezas > loteActual.piezas &&
            // Que de verdad le baje el precio por pieza…
            l.precio / l.piezas <= ppuActual - 4 &&
            // …y que el salto sea creíble: nunca pedirle más del triple de lo
            // que ya iba a invertir (si no, se ve absurdo y pierde confianza).
            l.precio - loteActual.precio <= loteActual.precio * 2
        ).sort((a, b) => a.piezas - b.piezas)[0]
      : undefined;

  const sig = siguiente
    ? {
        lote: siguiente,
        ppu: siguiente.precio / siguiente.piezas,
        ahorroPorPieza: ppuActual - siguiente.precio / siguiente.piezas,
        invierteMas: siguiente.precio - c.subtotal,
        ganancia: Math.max(
          0,
          PPU_REFERENCIA * siguiente.piezas - siguiente.precio
        ),
      }
    : null;

  // Lo que falta por pagar: si ya aparto, el boton principal cobra la
  // diferencia, no el total otra vez.
  const saldo = Math.max(0, c.total - (c.apartado || 0));
  const anticipo = Math.max(100, Math.ceil(c.total * 0.05));
  const [apartando, setApartando] = useState(false);

  async function apartar() {
    if (apartando) return;
    setApartando(true);
    setErr("");
    gaLead("cotizacion_apartar_" + c.id);
    try {
      const res = await fetch("/api/cotizacion/apartar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.init_point) {
        setErr(data.error || "No se pudo abrir el apartado. Intenta de nuevo.");
        setApartando(false);
        return;
      }
      window.location.href = data.init_point;
    } catch {
      setErr("Error de conexión. Revisa tu internet e intenta de nuevo.");
      setApartando(false);
    }
  }

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
            <b>{c.lineas.length > 1 ? `${c.loteNombre} + ${c.lineas.length - 1} más` : c.loteNombre}</b>
            {c.piezas > 0 && c.ppu > 0 ? (
              <span>
                {c.piezas} piezas surtidas · ${c.ppu.toFixed(0)} por pieza
              </span>
            ) : null}
            {c.lineas.length > 1 && (
              <span className="cot-lineas">
                {c.lineas
                  .slice(1)
                  .map((l) => (l.qty > 1 ? `${l.qty}× ` : "") + l.nombre)
                  .join(" · ")}
              </span>
            )}
            <span className="cot-marcas">
              e.l.f · NYX · Maybelline · L&apos;Oréal · Pixi
            </span>
            {c.qty > 1 && <span className="cot-qty">{c.qty} lotes</span>}
          </div>
        </div>

        {/* Desglose con el envío YA calculado */}
        <div className="cot-desglose">
          {c.lineas.length > 1 ? (
            c.lineas.map((l, i) => (
              <div className="cot-d-row" key={i}>
                <span>
                  {l.qty > 1 ? `${l.qty}× ` : ""}
                  {l.nombre}
                  {l.descripcion ? (
                    <em className="cot-d-note">{l.descripcion}</em>
                  ) : null}
                </span>
                <b>{fmx(l.importe)}</b>
              </div>
            ))
          ) : (
            <div className="cot-d-row">
              <span>
                {c.lineas[0]?.esLote === false ? "Tu pedido" : "Tu lote"}
                {c.lineas[0]?.descripcion ? (
                  <em className="cot-d-note">{c.lineas[0].descripcion}</em>
                ) : null}
              </span>
              <b>{fmx(c.subtotal)}</b>
            </div>
          )}
          {c.descuento > 0 && (
            <div className="cot-d-row cot-d-desc">
              <span>
                Descuento especial
                {c.descuentoPct ? ` (${c.descuentoPct}%)` : ""}
              </span>
              <b>−{fmx(c.descuento)}</b>
            </div>
          )}
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
              <b>{fmx(pagaPorElLote)}</b>
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

        {sig && (
          <div className="cot-up">
            <div className="cot-up-tit">
              💡 ¿Y si te llevas el de {sig.lote.piezas} piezas?
            </div>
            <p className="cot-up-sub">
              Es el mismo surtido, pero cada pieza te sale{" "}
              <b>${Math.round(sig.ahorroPorPieza)} más barata</b>.
            </p>

            <div className="cot-up-grid">
              <div className="cot-up-col">
                <span className="cot-up-lb">Este lote</span>
                <b>{c.piezas} pzas</b>
                <span className="cot-up-ppu">${ppuActual.toFixed(0)} c/u</span>
                <span className="cot-up-gan">Ganas {fmx(ganancia)}</span>
              </div>
              <div className="cot-up-flecha">→</div>
              <div className="cot-up-col cot-up-mejor">
                <span className="cot-up-lb">El de {sig.lote.piezas}</span>
                <b>{sig.lote.piezas} pzas</b>
                <span className="cot-up-ppu">${sig.ppu.toFixed(0)} c/u</span>
                <span className="cot-up-gan">Ganas {fmx(sig.ganancia)}</span>
              </div>
            </div>

            <p className="cot-up-cuenta">
              Inviertes <b>{fmx(sig.invierteMas)}</b> más y tu ganancia estimada
              sube <b>{fmx(sig.ganancia - ganancia)}</b>.
            </p>

            <a
              className="cot-up-btn"
              href={`https://wa.me/${WPP}?text=${encodeURIComponent(
                `Hola! Vi mi cotización ${c.id} y me interesa mejor el lote de ${sig.lote.piezas} piezas. ¿Me lo actualizas?`
              )}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => gaLead("cotizacion_upsell_" + sig.lote.id)}
            >
              Quiero el de {sig.lote.piezas} piezas →
            </a>
            <p className="cot-up-nota">
              Te actualizamos esta misma cotización con el envío recalculado. Si
              prefieres quedarte con la de arriba, también está perfecto 💕
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
            {enApp && (
              <div className="cot-navaviso">
                <b>Antes de pagar:</b> estás viendo esto dentro de otra
                aplicación, y ahí el pago suele cortarse a la mitad. Copia tu
                link y ábrelo en Chrome o Safari.
                <button
                  type="button"
                  className="cot-copiar"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(window.location.href);
                      setCopiado(true);
                      setTimeout(() => setCopiado(false), 2500);
                    } catch {
                      setCopiado(false);
                    }
                  }}
                >
                  {copiado ? "✓ Link copiado" : "📋 Copiar mi link"}
                </button>
              </div>
            )}
            {c.apartado > 0 && (
              <div className="cot-apartado-ok">
                ✓ Ya apartaste <b>{fmx(c.apartado)}</b> · tu lote está reservado
                <span>Te falta {fmx(saldo)} para completarlo.</span>
              </div>
            )}
            <button className="cot-btn" onClick={pagar} disabled={yendo}>
              {yendo
                ? "Abriendo el pago…"
                : c.apartado > 0
                ? `Pagar el resto ${fmx(saldo)} →`
                : `Pagar ${fmx(c.total)} →`}
            </button>
            {c.apartado === 0 && (
              <>
                <button
                  className="cot-btn-apartar"
                  onClick={apartar}
                  disabled={apartando}
                >
                  {apartando
                    ? "Abriendo…"
                    : `🔒 Apartar con ${fmx(anticipo)} y pagar después`}
                </button>
                <p className="cot-apartar-nota">
                  Con el {Math.round(0.05 * 100)}% tu lote queda reservado a tu
                  nombre. El resto lo pagas cuando puedas, desde este mismo link.
                </p>
              </>
            )}
            {err && <div className="co-error" style={{ marginTop: 10 }}>{err}</div>}
            {/* Salida para quien no logre pagar: antes simplemente desaparecia. */}
            <a
              className="cot-ayuda"
              target="_blank"
              rel="noreferrer"
              href={`https://wa.me/${WPP}?text=${encodeURIComponent(
                "Hola! Estoy intentando pagar mi cotización " +
                  c.id +
                  " y no me deja. ¿Me ayudas?"
              )}`}
              onClick={() => gaLead("cotizacion_ayuda_" + c.id)}
            >
              ¿No te deja pagar? Escríbenos y lo resolvemos →
            </a>

            {/* ---- Transferencia SPEI ---- */}
            <button
              type="button"
              className="cot-spei-abrir"
              onClick={() => setVerSpei((v) => !v)}
            >
              {verSpei ? "Ocultar" : "🏦 Prefiero pagar por transferencia"}
            </button>

            {verSpei && (
              <div className="cot-spei">
                <p className="cot-spei-intro">
                  Transfiere desde la app de tu banco. Es inmediato y funciona
                  aunque el pago en línea te falle.
                </p>

                <div className="cot-spei-row">
                  <span>Banco</span>
                  <b>{DATOS_BANCARIOS.banco}</b>
                </div>

                <div className="cot-spei-campo">
                  <span>CLABE</span>
                  <b className="cot-spei-clabe">{clabeLegible()}</b>
                  <button
                    type="button"
                    onClick={() => copiar(DATOS_BANCARIOS.clabe, "clabe")}
                  >
                    {copiadoQue === "clabe" ? "✓ Copiada" : "Copiar"}
                  </button>
                </div>

                <div className="cot-spei-row">
                  <span>Titular</span>
                  <b>{DATOS_BANCARIOS.titular}</b>
                </div>
                <p className="cot-spei-nota">{DATOS_BANCARIOS.notaTitular}</p>

                <div className="cot-spei-campo">
                  <span>Monto exacto</span>
                  <b>{fmx(c.total)}</b>
                  <button
                    type="button"
                    onClick={() => copiar(String(c.total), "monto")}
                  >
                    {copiadoQue === "monto" ? "✓ Copiado" : "Copiar"}
                  </button>
                </div>

                <div className="cot-spei-campo">
                  <span>Concepto o referencia</span>
                  <b>{c.id}</b>
                  <button type="button" onClick={() => copiar(c.id, "ref")}>
                    {copiadoQue === "ref" ? "✓ Copiado" : "Copiar"}
                  </button>
                </div>
                <p className="cot-spei-nota">
                  Pon <b>{c.id}</b> como concepto: así identificamos tu pago de
                  inmediato.
                </p>

                {aviso ? (
                  <div className="cot-spei-listo">
                    ✓ Gracias, ya nos avisaste. Revisamos que haya llegado y te
                    confirmamos por WhatsApp.
                    <a
                      target="_blank"
                      rel="noreferrer"
                      href={`https://wa.me/${WPP}?text=${encodeURIComponent(
                        "Hola! Ya transferí mi cotización " +
                          c.id +
                          " por " +
                          fmx(c.total) +
                          ". Te mando mi comprobante."
                      )}`}
                    >
                      📱 Mandar mi comprobante por WhatsApp →
                    </a>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="cot-spei-listo-btn"
                    onClick={avisarTransferencia}
                    disabled={avisando}
                  >
                    {avisando ? "Avisando…" : "Ya transferí, avisar"}
                  </button>
                )}
              </div>
            )}
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
