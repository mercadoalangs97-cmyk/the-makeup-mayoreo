"use client";

import { useCart } from "../lib/cart";
import { fmx, ENVIO_AMAREA_GRATIS_DESDE, ENVIO_AMAREA_TARIFA, modoEnvio } from "../lib/lotes";
import { imgOpt } from "../lib/img";

export default function CartDrawer() {
  const {
    items,
    count,
    total,
    isOpen,
    closeCart,
    changeQty,
    remove,
    tieneEnvioGratis,
    faltaEnvioGratis,
    progresoEnvio,
    checkoutWPP,
    checkoutMP,
  } = useCart();

  // ¿El carrito incluye algún lote? (los lotes sí ofrecen WhatsApp)
  const hayLote = items.some((it) => it.tipo === "lote");
  const modo = modoEnvio(items); // "amarea" | "cotizar" | "coordinar"

  return (
    <>
      <div
        className={"cart-overlay" + (isOpen ? " open" : "")}
        onClick={closeCart}
      ></div>
      <div className={"cart-drawer" + (isOpen ? " open" : "")}>
        <div className="cart-header">
          <div className="cart-title serif">Tu carrito</div>
          <button className="cart-close-btn" onClick={closeCart}>
            ✕
          </button>
        </div>

        {/* Barra de envío gratis: solo para carritos AMARÉA (sin lotes) */}
        {count > 0 && !hayLote && (
          <div className="fs-progress">
            {tieneEnvioGratis ? (
              <p>
                🎉 ¡Felicidades! Tienes <b>&nbsp;ENVÍO GRATIS</b>
              </p>
            ) : (
              <p>
                🚚 Te faltan <b>&nbsp;{fmx(faltaEnvioGratis)}&nbsp;</b> para
                envío gratis en productos individuales
              </p>
            )}
            <div className="fs-track">
              <div className="fs-fill" style={{ width: progresoEnvio + "%" }}></div>
            </div>
          </div>
        )}

        <div className="cart-body">
          {items.length === 0 ? (
            <div className="cart-empty">
              <div className="cart-empty-ico">🛍️</div>
              <p>
                Tu carrito está vacío.
                <br />
                Agrega lotes o productos individuales.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="cart-item">
                {item.foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imgOpt(item.foto, 144)}
                    alt={item.nombre}
                    loading="lazy"
                    decoding="async"
                    width={72}
                    height={72}
                  />
                ) : (
                  <div className="cart-item-ph">💄</div>
                )}
                <div>
                  <div className="cart-item-name">{item.nombre}</div>
                  <div className="cart-item-price">
                    {fmx(item.precio)} MXN
                    {item.sub ? (
                      <span className="cart-item-sub"> · {item.sub}</span>
                    ) : null}
                  </div>
                  <div className="qty-ctrl">
                    <button
                      className="qty-btn"
                      onClick={() => changeQty(item.id, -1)}
                    >
                      -
                    </button>
                    <span className="qty-num">{item.qty}</span>
                    <button
                      className="qty-btn"
                      onClick={() => changeQty(item.id, 1)}
                      disabled={item.max != null && item.qty >= item.max}
                    >
                      +
                    </button>
                  </div>
                </div>
                <button
                  className="cart-remove"
                  title="Quitar"
                  onClick={() => remove(item.id)}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        {count > 0 && (
          <div className="cart-footer">
            <div className="cart-total-row">
              <div className="cart-total-label">Total</div>
              <div className="cart-total-val serif">{fmx(total)}</div>
            </div>
            <button className="btn-mp" onClick={checkoutMP}>
              Pagar con Mercado Pago
            </button>
            {/* WhatsApp solo si el carrito incluye al menos un lote */}
            {hayLote && (
              <button className="btn-wpp-checkout" onClick={checkoutWPP}>
                Pedir lote por WhatsApp
              </button>
            )}
            <p className="cart-note">
              {modo === "coordinar"
                ? "Envío de mayoreo: se coordina por WhatsApp"
                : modo === "cotizar"
                ? "Envío por paquetería: se calcula al pagar"
                : tieneEnvioGratis
                ? "✓ Envío gratis incluido"
                : `Envío gratis desde ${fmx(ENVIO_AMAREA_GRATIS_DESDE)} en productos individuales · si no, ${fmx(ENVIO_AMAREA_TARIFA)} fijo`}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
