"use client";

import Link from "next/link";
import { fmx } from "../lib/lotes";
import { useCart } from "../lib/cart";
import { nombreDisplay, type Producto } from "../lib/productos";

export default function FilaProductos({
  titulo,
  subtitulo,
  productos,
}: {
  titulo: string;
  subtitulo?: string;
  productos: Producto[];
}) {
  const { add } = useCart();
  if (!productos || productos.length === 0) return null;

  return (
    <section className="fila-prod">
      <div className="fila-head">
        <h2 className="fila-titulo serif">{titulo}</h2>
        {subtitulo && <p className="fila-sub">{subtitulo}</p>}
      </div>
      <div className="fila-grid">
        {productos.map((p) => {
          const nombre = nombreDisplay(p);
          return (
            <div key={p.sku} className="prod-card">
              <Link href={`/amarea/${p.sku}`} className="prod-link">
                <div className="prod-img">
                  {p.foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.foto} alt={nombre} loading="lazy" />
                  ) : (
                    <div className="prod-img-ph">💄</div>
                  )}
                </div>
                <div className="prod-marca">{p.marcaNorm}</div>
                <div className="prod-nombre">{nombre}</div>
              </Link>
              <div className="prod-bottom">
                <div className="prod-precio serif">
                  {p.precio_mxn ? fmx(p.precio_mxn) : "—"}
                </div>
                <button
                  className="prod-add"
                  aria-label={"Agregar " + nombre}
                  onClick={() =>
                    add(
                      {
                        id: "prod:" + p.sku,
                        tipo: "producto",
                        nombre,
                        precio: p.precio_mxn ?? 0,
                        foto: p.foto,
                        max: p.stock,
                        sub: p.marcaNorm,
                      },
                      1
                    )
                  }
                >
                  Agregar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
