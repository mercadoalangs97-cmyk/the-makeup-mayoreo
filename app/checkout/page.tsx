"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { useCart } from "../lib/cart";
import { fmx, ENVIO_AMAREA_GRATIS_DESDE, calcularEnvio, modoEnvio } from "../lib/lotes";
import { gaBeginCheckout } from "../lib/analytics";

type OpcionEnvio = {
  proveedor: string;
  servicio: string;
  servicioCode: string;
  total: number;
  dias: number | null;
};

const ESTADOS_MX = [
  "Aguascalientes","Baja California","Baja California Sur","Campeche","Chiapas",
  "Chihuahua","Ciudad de México","Coahuila","Colima","Durango","Estado de México",
  "Guanajuato","Guerrero","Hidalgo","Jalisco","Michoacán","Morelos","Nayarit",
  "Nuevo León","Oaxaca","Puebla","Querétaro","Quintana Roo","San Luis Potosí",
  "Sinaloa","Sonora","Tabasco","Tamaulipas","Tlaxcala","Veracruz","Yucatán","Zacatecas",
];

const VACIO = {
  nombre: "", telefono: "", email: "", calle: "", numero: "",
  colonia: "", cp: "", ciudad: "", estado: "", referencias: "",
};

export default function CheckoutPage() {
  const { items, total, count } = useCart();
  const [f, setF] = useState({ ...VACIO });
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Modo de envío del carrito:
  //  - "amarea":   regla fija ($599 gratis / $129)
  //  - "cotizar":  lotes → cotización Skydropx (el cliente elige paquetería)
  //  - "coordinar": lote especial (500 pz) → por WhatsApp
  const modo = modoEnvio(items);

  // GA4: iniciar checkout (una vez, cuando el carrito ya hidrató con items).
  const beganRef = useRef(false);
  useEffect(() => {
    if (!beganRef.current && items.length > 0) {
      beganRef.current = true;
      gaBeginCheckout(items, total);
    }
  }, [items, total]);

  // Estado de cotización de lotes
  const [opciones, setOpciones] = useState<OpcionEnvio[] | null>(null);
  const [envioSel, setEnvioSel] = useState<string>(""); // servicioCode elegido
  const [cotizando, setCotizando] = useState(false);
  const [cotizaError, setCotizaError] = useState("");

  // Validación por C.P. (autocompleta estado/municipio + colonias)
  const [colonias, setColonias] = useState<string[] | null>(null);
  const [coloniaManual, setColoniaManual] = useState(false);
  const [cpLoading, setCpLoading] = useState(false);
  const [cpMsg, setCpMsg] = useState("");

  // Si cambian C.P./colonia/ciudad/estado o el carrito, invalidamos la cotización
  useEffect(() => {
    setOpciones(null);
    setEnvioSel("");
    setCotizaError("");
  }, [f.cp, f.colonia, f.ciudad, f.estado, items]);

  // Al escribir 5 dígitos de C.P., consultamos el catálogo SEPOMEX
  useEffect(() => {
    const cp = f.cp.replace(/\D/g, "");
    if (cp.length !== 5) {
      setColonias(null);
      setColoniaManual(false);
      setCpMsg("");
      return;
    }
    let cancel = false;
    setCpLoading(true);
    setCpMsg("");
    fetch("/api/cp/" + cp)
      .then((r) => r.json())
      .then((d) => {
        if (cancel) return;
        setCpLoading(false);
        if (d && d.found) {
          setColonias(d.colonias || []);
          setColoniaManual(false);
          setF((prev) => ({
            ...prev,
            estado: d.estado || prev.estado,
            ciudad: d.municipio || d.ciudad || prev.ciudad,
            colonia: "",
          }));
          setCpMsg("✓ " + [d.municipio, d.estado].filter(Boolean).join(", "));
        } else {
          setColonias(null);
          setColoniaManual(true);
          setCpMsg("No encontramos ese C.P.; escribe tu dirección a mano.");
        }
      })
      .catch(() => {
        if (cancel) return;
        setCpLoading(false);
        setColonias(null);
        setColoniaManual(true);
        setCpMsg("");
      });
    return () => {
      cancel = true;
    };
  }, [f.cp]);

  const opcionElegida = opciones?.find((o) => o.servicioCode === envioSel) || null;

  // Envío que se cobra según el modo
  const envioMonto =
    modo === "amarea"
      ? calcularEnvio(items) ?? 0
      : modo === "cotizar"
      ? opcionElegida?.total ?? null // null = aún no elige
      : 0; // coordinar
  const totalPagar = total + (envioMonto ?? 0);

  function set(campo: string, valor: string) {
    setF((prev) => ({ ...prev, [campo]: valor }));
  }

  async function cotizar() {
    if (f.cp.replace(/\D/g, "").length !== 5) {
      setCotizaError("Escribe un C.P. de 5 dígitos.");
      return;
    }
    if (!f.colonia.trim() || !f.ciudad.trim() || !f.estado) {
      setCotizaError("Completa colonia, ciudad y estado para cotizar.");
      return;
    }
    setCotizaError("");
    setCotizando(true);
    try {
      const res = await fetch("/api/envio/cotizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((it) => ({ id: it.id, qty: it.qty })),
          destino: { cp: f.cp, estado: f.estado, ciudad: f.ciudad, colonia: f.colonia },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.opciones) {
        setCotizaError(data.error || "No se pudo cotizar. Intenta de nuevo.");
        setCotizando(false);
        return;
      }
      const ops = data.opciones as OpcionEnvio[];
      setOpciones(ops);
      // Pre-seleccionamos la más barata (viene ordenada por precio): Estafeta económica por defecto.
      setEnvioSel(ops[0]?.servicioCode || "");
      setCotizando(false);
    } catch {
      setCotizaError("Error de conexión al cotizar. Intenta de nuevo.");
      setCotizando(false);
    }
  }

  function validar(): string | null {
    if (f.nombre.trim().length < 3) return "Escribe tu nombre completo.";
    if (f.telefono.replace(/\D/g, "").length !== 10)
      return "El WhatsApp debe tener 10 dígitos.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()))
      return "Escribe un correo válido.";
    if (!f.calle.trim()) return "Falta la calle.";
    if (!f.numero.trim()) return "Falta el número.";
    if (!f.colonia.trim()) return "Falta la colonia.";
    if (f.cp.replace(/\D/g, "").length !== 5) return "El C.P. debe tener 5 dígitos.";
    if (!f.ciudad.trim()) return "Falta la ciudad.";
    if (!f.estado) return "Selecciona tu estado.";
    return null;
  }

  async function pagar(ev: React.FormEvent) {
    ev.preventDefault();
    const err = validar();
    if (err) {
      setError(err);
      return;
    }
    if (modo === "cotizar" && !envioSel) {
      setError("Cotiza y elige una opción de envío antes de pagar.");
      return;
    }
    setError("");
    setEnviando(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((it) => ({ id: it.id, qty: it.qty })),
          envio: f,
          envioServicio: envioSel || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.init_point) {
        setError(data.error || "No se pudo iniciar el pago. Intenta de nuevo.");
        setEnviando(false);
        return;
      }
      // Guardamos el valor de la venta para disparar "purchase" en /checkout/exito.
      try {
        sessionStorage.setItem(
          "amarea_ga_purchase",
          JSON.stringify({
            id: data.orden_id || "",
            value: totalPagar,
            items: items.map((it) => ({
              item_id: it.id,
              item_name: it.nombre,
              price: it.precio,
              quantity: it.qty,
            })),
          })
        );
      } catch {}
      window.location.href = data.init_point;
    } catch {
      setError("Error de conexión. Revisa tu internet e intenta de nuevo.");
      setEnviando(false);
    }
  }

  return (
    <>
      <SiteHeader variant="landing" />
      <main className="co-main">
        {count === 0 ? (
          <div className="co-vacio">
            <p>Tu carrito está vacío.</p>
            <Link href="/amarea" className="btn-primary">
              Ir a la tienda
            </Link>
          </div>
        ) : (
          <>
            <h1 className="co-titulo serif">Datos de envío</h1>
            <p className="co-sub">
              {modo === "coordinar"
                ? "Con estos datos preparamos tu pedido de mayoreo. El costo de envío se coordina por WhatsApp después de tu compra."
                : modo === "cotizar"
                ? "Llena tu dirección y cotiza el envío: elige la paquetería que prefieras y se suma a tu total."
                : "Con estos datos preparamos y enviamos tu pedido. El envío ya está incluido en tu total."}
            </p>

            <div className="co-grid">
              {/* FORMULARIO */}
              <form className="co-form" onSubmit={pagar} noValidate>
                <label className="co-field co-col2">
                  <span>Nombre completo *</span>
                  <input value={f.nombre} onChange={(e) => set("nombre", e.target.value)} autoComplete="name" />
                </label>
                <label className="co-field">
                  <span>WhatsApp (10 dígitos) *</span>
                  <input
                    value={f.telefono} inputMode="numeric" maxLength={10}
                    onChange={(e) => set("telefono", e.target.value.replace(/\D/g, "").slice(0, 10))}
                    autoComplete="tel"
                  />
                </label>
                <label className="co-field">
                  <span>Correo electrónico *</span>
                  <input value={f.email} type="email" onChange={(e) => set("email", e.target.value)} autoComplete="email" />
                </label>
                <label className="co-field">
                  <span>Calle *</span>
                  <input value={f.calle} onChange={(e) => set("calle", e.target.value)} autoComplete="address-line1" />
                </label>
                <label className="co-field">
                  <span>Número *</span>
                  <input value={f.numero} onChange={(e) => set("numero", e.target.value)} />
                </label>
                <label className="co-field">
                  <span>C.P. (5 dígitos) *</span>
                  <input
                    value={f.cp} inputMode="numeric" maxLength={5}
                    onChange={(e) => set("cp", e.target.value.replace(/\D/g, "").slice(0, 5))}
                    autoComplete="postal-code"
                  />
                  {(cpLoading || cpMsg) && (
                    <small className="co-cp-msg">{cpLoading ? "Buscando C.P.…" : cpMsg}</small>
                  )}
                </label>
                <label className="co-field">
                  <span>Colonia *</span>
                  {colonias && colonias.length > 0 && !coloniaManual ? (
                    <select
                      value={f.colonia}
                      onChange={(e) => {
                        if (e.target.value === "__otra__") {
                          setColoniaManual(true);
                          set("colonia", "");
                        } else set("colonia", e.target.value);
                      }}
                    >
                      <option value="">Selecciona tu colonia…</option>
                      {colonias.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="__otra__">Otra (escribir)…</option>
                    </select>
                  ) : (
                    <input
                      value={f.colonia}
                      placeholder={coloniaManual ? "Escribe tu colonia" : ""}
                      onChange={(e) => set("colonia", e.target.value)}
                    />
                  )}
                </label>
                <label className="co-field">
                  <span>Ciudad / Municipio *</span>
                  <input value={f.ciudad} onChange={(e) => set("ciudad", e.target.value)} />
                </label>
                <label className="co-field">
                  <span>Estado *</span>
                  <select value={f.estado} onChange={(e) => set("estado", e.target.value)}>
                    <option value="">Selecciona…</option>
                    {ESTADOS_MX.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label className="co-field co-col2">
                  <span>Referencias (opcional)</span>
                  <input
                    value={f.referencias}
                    placeholder="Entre calles, color de casa, indicaciones…"
                    onChange={(e) => set("referencias", e.target.value)}
                  />
                </label>

                {error && <div className="co-error">{error}</div>}

                <button
                  className="co-pagar"
                  type="submit"
                  disabled={enviando || (modo === "cotizar" && !envioSel)}
                >
                  {enviando
                    ? "Redirigiendo a Mercado Pago…"
                    : modo === "cotizar" && !envioSel
                    ? "Cotiza y elige tu envío"
                    : `Ir a pagar · ${fmx(totalPagar)}`}
                </button>
                <p className="co-nota">🔒 Pago seguro con Mercado Pago · tarjeta, SPEI u OXXO</p>
              </form>

              {/* RESUMEN */}
              <aside className="co-resumen">
                <h2 className="co-resumen-tit serif">Tu pedido</h2>
                <div className="co-items">
                  {items.map((it) => (
                    <div className="co-item" key={it.id}>
                      <span className="co-item-q">{it.qty}×</span>
                      <span className="co-item-n">
                        {it.nombre}
                        {it.sub ? <em> · {it.sub}</em> : null}
                      </span>
                      <span className="co-item-p">{fmx(it.precio * it.qty)}</span>
                    </div>
                  ))}
                </div>
                <div className="co-subtotal-row">
                  <span>Subtotal</span>
                  <span>{fmx(total)}</span>
                </div>

                {modo === "cotizar" && (
                  <div className="co-cotiza">
                    <button
                      type="button"
                      className="co-cotizar-btn"
                      onClick={cotizar}
                      disabled={cotizando}
                    >
                      {cotizando
                        ? "Cotizando envío…"
                        : opciones
                        ? "Volver a cotizar"
                        : "📦 Cotizar envío"}
                    </button>
                    {cotizaError && <div className="co-error">{cotizaError}</div>}
                    {opciones && opciones.length > 0 && (
                      <div className="co-opciones">
                        {opciones.map((o) => (
                          <label
                            key={o.servicioCode}
                            className={
                              "co-opcion" + (envioSel === o.servicioCode ? " sel" : "")
                            }
                          >
                            <input
                              type="radio"
                              name="envio"
                              value={o.servicioCode}
                              checked={envioSel === o.servicioCode}
                              onChange={() => setEnvioSel(o.servicioCode)}
                            />
                            <span className="co-opcion-info">
                              <span className="co-opcion-nom">
                                {o.proveedor} · {o.servicio}
                              </span>
                              <span className="co-opcion-dias">
                                {o.dias != null ? `${o.dias} día(s) hábiles` : "Tiempo variable"}
                              </span>
                            </span>
                            <span className="co-opcion-precio">{fmx(o.total)}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="co-subtotal-row">
                  <span>Envío</span>
                  <span>
                    {modo === "coordinar"
                      ? "Se coordina por WhatsApp"
                      : modo === "cotizar"
                      ? opcionElegida
                        ? fmx(opcionElegida.total)
                        : "Por calcular"
                      : envioMonto === 0
                      ? "¡Gratis! 🎉"
                      : fmx(envioMonto ?? 0)}
                  </span>
                </div>
                <div className="co-total-row">
                  <span>Total</span>
                  <span className="co-total">{fmx(totalPagar)}</span>
                </div>
                <p className="co-envio-nota">
                  {modo === "coordinar"
                    ? "El envío de mayoreo se coordina por WhatsApp tras tu compra."
                    : modo === "cotizar"
                    ? "El envío se calcula según tu C.P. y el peso del lote. Elige la paquetería que prefieras."
                    : envioMonto === 0
                    ? "¡Tienes envío gratis! 🎉"
                    : `Envío gratis desde ${fmx(ENVIO_AMAREA_GRATIS_DESDE)} en productos individuales.`}
                </p>
              </aside>
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
