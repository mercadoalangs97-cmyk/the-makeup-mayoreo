"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fmx, WPP } from "../../lib/lotes";
import { useCart } from "../../lib/cart";
import { getBrowserSupabase, supabasePublicConfigurado } from "../../lib/supabase";
import { nombreDisplay, type Producto } from "../../lib/productos";

// Modo de uso generico segun categoria
function modoDeUso(categoria: string | null): string {
  switch (categoria) {
    case "Labios":
      return "Aplica directamente sobre los labios partiendo del centro hacia las comisuras. Reaplica durante el día según lo necesites.";
    case "Ojos":
      return "Aplica sobre el párpado o las pestañas con movimientos suaves. Difumina para un acabado uniforme y construye la intensidad por capas.";
    case "Cejas":
      return "Define el contorno de la ceja y rellena con trazos cortos imitando el vello natural. Fija al final para mayor duración.";
    case "Contorno":
      return "Aplica en las zonas que quieras definir (pómulos, mandíbula, nariz) y difumina muy bien hacia arriba para un acabado natural.";
    case "Base":
    case "Rostro":
    default:
      return "Aplica sobre el rostro limpio e hidratado, del centro hacia afuera, con esponja, brocha o dedos. Difumina bien en el nacimiento del cabello y el cuello.";
  }
}

function Seccion({
  titulo,
  abierta,
  onToggle,
  children,
}: {
  titulo: string;
  abierta: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={"acc-item" + (abierta ? " open" : "")}>
      <button className="acc-head" onClick={onToggle} aria-expanded={abierta}>
        <span>{titulo}</span>
        <span className="acc-icon">{abierta ? "−" : "+"}</span>
      </button>
      {abierta && <div className="acc-body">{children}</div>}
    </div>
  );
}

export default function ProductoDetalle({
  producto,
  variantes = [],
}: {
  producto: Producto;
  variantes?: Producto[];
}) {
  const { add, openCart } = useCart();
  const [stock, setStock] = useState(producto.stock);
  const [qty, setQty] = useState(1);
  const [abierta, setAbierta] = useState<string | null>("Descripción");

  // Stock en tiempo real (Realtime de Supabase sobre la tabla productos)
  useEffect(() => {
    if (!supabasePublicConfigurado()) return;
    const supabase = getBrowserSupabase();
    const canal = supabase
      .channel("producto-" + producto.sku)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "productos",
          filter: `sku=eq.${producto.sku}`,
        },
        (payload) => {
          const nuevo = payload.new as { stock?: number };
          if (typeof nuevo.stock === "number") setStock(nuevo.stock);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [producto.sku]);

  // Ajusta la cantidad si el stock baja por debajo
  useEffect(() => {
    setQty((q) => Math.min(Math.max(1, q), Math.max(1, stock)));
  }, [stock]);

  const agotado = stock <= 0;
  const low = !agotado && (stock <= (producto.stock_min ?? 3) || stock <= 3);
  const precio = producto.precio_mxn ?? 0;
  const nombre = nombreDisplay(producto);

  function agregar() {
    if (agotado) return;
    add(
      {
        id: "prod:" + producto.sku,
        tipo: "producto",
        nombre: nombre,
        precio,
        foto: producto.foto,
        max: stock,
        sub: producto.marcaNorm,
      },
      qty
    );
    openCart();
  }

  function comprarWPP() {
    const msg =
      "¡Hola! Me interesa este producto:\n\n- " +
      nombre +
      " (" +
      producto.marcaNorm +
      ") x" +
      qty +
      " = " +
      fmx(precio * qty) +
      " MXN\n\n¿Está disponible?";
    window.open(
      "https://wa.me/" + WPP + "?text=" + encodeURIComponent(msg),
      "_blank"
    );
  }

  const descripcion =
    producto.notas && producto.notas.trim().length > 3
      ? producto.notas
      : `${nombre} de ${producto.marcaNorm}, una de las marcas de beauty que más amas.` +
        (producto.variante ? ` Tono / variante: ${producto.variante}.` : "") +
        (producto.categoria ? ` Categoría: ${producto.categoria}.` : "");

  const toggle = (t: string) => setAbierta((a) => (a === t ? null : t));

  return (
    <main className="pd-main">
      <nav className="pd-breadcrumb">
        <Link href="/">Inicio</Link>
        <span>/</span>
        <Link href="/amarea">AMAREA</Link>
        <span>/</span>
        <span className="pd-bc-current">{nombre}</span>
      </nav>

      <div className="pd-grid">
        {/* FOTO */}
        <div className="pd-media">
          <div className="pd-img">
            {producto.foto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={producto.foto} alt={nombre} />
            ) : (
              <div className="pd-img-ph">💄</div>
            )}
            {low && (
              <span className="pd-badge-low">
                {stock === 1 ? "¡Última pieza!" : `¡Últimas ${stock} piezas!`}
              </span>
            )}
          </div>
        </div>

        {/* INFO */}
        <div className="pd-info">
          <div className="pd-marca">{producto.marcaNorm}</div>
          <h1 className="pd-nombre serif">{nombre}</h1>
          {producto.categoria && (
            <div className="pd-categoria">{producto.categoria}</div>
          )}

          <div className="pd-precio serif">
            {precio ? fmx(precio) : "—"} <span className="pd-moneda">MXN</span>
          </div>

          {/* Stock en tiempo real */}
          <div className="pd-stock">
            {agotado ? (
              <span className="pd-stock-out">● Agotado por ahora</span>
            ) : low ? (
              <span className="pd-stock-low">
                🔥 {stock === 1 ? "¡Solo queda 1 pieza!" : `¡Solo quedan ${stock} piezas!`}
              </span>
            ) : (
              <span className="pd-stock-ok">● Disponible</span>
            )}
          </div>

          {/* Selector de tonos (estilo Sephora) */}
          {variantes.length > 1 && (
            <div className="tonos-wrap">
              <div className="tonos-label">
                Tono: <b>{producto.variante || "Único"}</b>
                <span className="tonos-count">
                  {variantes.length} tonos disponibles
                </span>
              </div>
              <div className="tonos-row">
                {variantes.map((v) => {
                  const activo = v.sku === producto.sku;
                  return (
                    <Link
                      key={v.sku}
                      href={`/amarea/${v.sku}`}
                      className={"tono-swatch" + (activo ? " active" : "")}
                      title={v.variante || nombreDisplay(v)}
                      aria-label={"Tono " + (v.variante || "")}
                      aria-current={activo ? "true" : undefined}
                      scroll
                    >
                      {v.foto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={v.foto} alt={v.variante || nombreDisplay(v)} />
                      ) : (
                        <span className="tono-ph">💄</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cantidad + agregar */}
          {!agotado && (
            <div className="pd-buy">
              <div className="pd-qty">
                <button
                  className="modal-qty-btn"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  aria-label="Menos"
                >
                  -
                </button>
                <span className="modal-qty-num">{qty}</span>
                <button
                  className="modal-qty-btn"
                  onClick={() => setQty((q) => Math.min(stock, q + 1))}
                  disabled={qty >= stock}
                  aria-label="Más"
                >
                  +
                </button>
              </div>
              <button className="pd-add" onClick={agregar}>
                Agregar al carrito · {fmx(precio * qty)}
              </button>
            </div>
          )}
          {agotado && (
            <button className="pd-add pd-add-out" disabled>
              Agotado
            </button>
          )}

          <button className="pd-wpp" onClick={comprarWPP}>
            Preguntar por WhatsApp
          </button>

          {/* Sellos de confianza */}
          <div className="pd-trust">
            <span>💄 Marcas originales</span>
            <span>🔒 Pago seguro</span>
            <span>🚚 Envío a todo México</span>
          </div>

          {/* Secciones desplegables estilo Ginebra */}
          <div className="accordion">
            <Seccion
              titulo="Descripción"
              abierta={abierta === "Descripción"}
              onToggle={() => toggle("Descripción")}
            >
              <p>{descripcion}</p>
            </Seccion>
            <Seccion
              titulo="Modo de uso"
              abierta={abierta === "Modo de uso"}
              onToggle={() => toggle("Modo de uso")}
            >
              <p>{modoDeUso(producto.categoria)}</p>
            </Seccion>
            <Seccion
              titulo="Envíos y devoluciones"
              abierta={abierta === "Envíos y devoluciones"}
              onToggle={() => toggle("Envíos y devoluciones")}
            >
              <ul className="pd-list">
                <li>Envío a toda la República. 48 h en CDMX, 2–4 días al resto del país.</li>
                <li>Envío GRATIS en compras mayores a {fmx(2500)} MXN.</li>
                <li>Empaque discreto y seguro. Factura disponible a petición.</li>
                <li>Cambios y aclaraciones por WhatsApp dentro de los primeros 7 días.</li>
              </ul>
            </Seccion>
          </div>
        </div>
      </div>

      <div className="pd-back">
        <Link href="/amarea" className="pd-back-link">
          ← Volver al catálogo
        </Link>
      </div>
    </main>
  );
}
