"use client";

import { useState } from "react";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { useCart } from "../lib/cart";
import { fmx, ENVIO_GRATIS_DESDE } from "../lib/lotes";

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

  function set(campo: string, valor: string) {
    setF((prev) => ({ ...prev, [campo]: valor }));
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
    setError("");
    setEnviando(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((it) => ({ id: it.id, qty: it.qty })),
          envio: f,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.init_point) {
        setError(data.error || "No se pudo iniciar el pago. Intenta de nuevo.");
        setEnviando(false);
        return;
      }
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
              Con estos datos preparamos y enviamos tu pedido. El costo de envío
              se coordina por WhatsApp después de tu compra.
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
                  <span>Colonia *</span>
                  <input value={f.colonia} onChange={(e) => set("colonia", e.target.value)} />
                </label>
                <label className="co-field">
                  <span>C.P. (5 dígitos) *</span>
                  <input
                    value={f.cp} inputMode="numeric" maxLength={5}
                    onChange={(e) => set("cp", e.target.value.replace(/\D/g, "").slice(0, 5))}
                    autoComplete="postal-code"
                  />
                </label>
                <label className="co-field">
                  <span>Ciudad *</span>
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

                <button className="co-pagar" type="submit" disabled={enviando}>
                  {enviando ? "Redirigiendo a Mercado Pago…" : `Ir a pagar · ${fmx(total)}`}
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
                <div className="co-total-row">
                  <span>Total</span>
                  <span className="co-total">{fmx(total)}</span>
                </div>
                <p className="co-envio-nota">
                  + envío (se coordina por WhatsApp).{" "}
                  {total >= ENVIO_GRATIS_DESDE
                    ? "¡Tienes envío gratis! 🎉"
                    : `Envío gratis desde ${fmx(ENVIO_GRATIS_DESDE)}.`}
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
