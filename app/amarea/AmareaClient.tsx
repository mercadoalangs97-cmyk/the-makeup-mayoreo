"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { fmx } from "../lib/lotes";
import { useCart } from "../lib/cart";
import { nombreDisplay, type Producto } from "../lib/productos";

export default function ShopClient({
  productos,
  categorias,
  marcas,
  error,
}: {
  productos: Producto[];
  categorias: string[];
  marcas: string[];
  error: string | null;
}) {
  const { add } = useCart();
  const [cat, setCat] = useState<string>("Todas");
  const [marca, setMarca] = useState<string>("Todas");

  const filtrados = useMemo(() => {
    return productos.filter(
      (p) =>
        (cat === "Todas" || p.categoria === cat) &&
        (marca === "Todas" || p.marcaNorm === marca)
    );
  }, [productos, cat, marca]);

  function agregar(p: Producto) {
    add(
      {
        id: "prod:" + p.sku,
        tipo: "producto",
        nombre: nombreDisplay(p),
        precio: p.precio_mxn ?? 0,
        foto: p.foto,
        max: p.stock,
        sub: p.marcaNorm,
      },
      1
    );
  }

  return (
    <main>
      {/* HERO de la tienda */}
      <section className="shop-hero">
        <div className="shop-hero-inner">
          <div className="shop-hero-eyebrow">AMAREA · Tus marcas favoritas</div>
          <h1 className="shop-hero-h1 serif">
            Las mejores marcas de beauty <em>por pieza</em>
          </h1>
          <p className="shop-hero-sub">
            Las mismas marcas premium de nuestros lotes, ahora unidad por unidad.
            e.l.f, NYX, Maybelline, L&apos;Oréal y más — con envío a todo México.
          </p>
        </div>
      </section>

      <section className="section shop-section">
        {error ? (
          <div className="shop-error">
            <p>⚠️ No pudimos cargar el catálogo en este momento.</p>
            <span>{error}</span>
          </div>
        ) : productos.length === 0 ? (
          <div className="shop-error">
            <p>Aún no hay productos disponibles.</p>
          </div>
        ) : (
          <>
            {/* FILTROS */}
            <div className="shop-filters">
              <div className="filter-group">
                <span className="filter-label">Categoría</span>
                <div className="filters">
                  <button
                    className={"filter-btn" + (cat === "Todas" ? " active" : "")}
                    onClick={() => setCat("Todas")}
                  >
                    Todas
                  </button>
                  {categorias.map((c) => (
                    <button
                      key={c}
                      className={"filter-btn" + (cat === c ? " active" : "")}
                      onClick={() => setCat(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="filter-group">
                <span className="filter-label">Marca</span>
                <div className="filters">
                  <button
                    className={"filter-btn" + (marca === "Todas" ? " active" : "")}
                    onClick={() => setMarca("Todas")}
                  >
                    Todas
                  </button>
                  {marcas.map((m) => (
                    <button
                      key={m}
                      className={"filter-btn" + (marca === m ? " active" : "")}
                      onClick={() => setMarca(m)}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <p className="shop-count">
              {filtrados.length}{" "}
              {filtrados.length === 1 ? "producto" : "productos"}
            </p>

            {/* GRID */}
            <div className="prod-grid">
              {filtrados.map((p) => {
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
                        onClick={() => agregar(p)}
                        aria-label={"Agregar " + p.nombre}
                      >
                        Agregar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {filtrados.length === 0 && (
              <p className="shop-empty">
                No hay productos con esos filtros. Prueba con otra combinación.
              </p>
            )}
          </>
        )}
      </section>
    </main>
  );
}
