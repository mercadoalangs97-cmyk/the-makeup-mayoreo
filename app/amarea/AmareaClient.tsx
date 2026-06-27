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
  const [query, setQuery] = useState<string>("");
  const [filtrosOpen, setFiltrosOpen] = useState<boolean>(false);

  const q = query.trim().toLowerCase();
  const filtrados = useMemo(() => {
    return productos.filter((p) => {
      const okCat = cat === "Todas" || p.categoria === cat;
      const okMarca = marca === "Todas" || p.marcaNorm === marca;
      const okQ =
        !q ||
        nombreDisplay(p).toLowerCase().includes(q) ||
        (p.nombre || "").toLowerCase().includes(q) ||
        (p.marcaNorm || "").toLowerCase().includes(q) ||
        (p.marca || "").toLowerCase().includes(q) ||
        (p.variante || "").toLowerCase().includes(q) ||
        (p.sku || "").toLowerCase().includes(q);
      return okCat && okMarca && okQ;
    });
  }, [productos, cat, marca, q]);

  const activos = (cat !== "Todas" ? 1 : 0) + (marca !== "Todas" ? 1 : 0);
  const limpiarFiltros = () => {
    setCat("Todas");
    setMarca("Todas");
  };

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
            {/* TOOLBAR: buscador + botón de filtros */}
            <div className="shop-toolbar">
              <div className="shop-search">
                <span className="shop-search-ico" aria-hidden="true">
                  🔍
                </span>
                <input
                  type="search"
                  className="shop-search-input"
                  placeholder="Buscar producto o marca…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Buscar productos"
                />
                {query && (
                  <button
                    className="shop-search-clear"
                    onClick={() => setQuery("")}
                    aria-label="Limpiar búsqueda"
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                className={"shop-filtros-btn" + (filtrosOpen ? " open" : "")}
                onClick={() => setFiltrosOpen((v) => !v)}
                aria-expanded={filtrosOpen}
              >
                <span aria-hidden="true">⚙</span> Filtros
                {activos > 0 && (
                  <span className="shop-filtros-count">{activos}</span>
                )}
              </button>
            </div>

            {/* Chips de filtros activos */}
            {activos > 0 && (
              <div className="shop-chips">
                {cat !== "Todas" && (
                  <button className="shop-chip" onClick={() => setCat("Todas")}>
                    {cat} <span aria-hidden="true">✕</span>
                  </button>
                )}
                {marca !== "Todas" && (
                  <button
                    className="shop-chip"
                    onClick={() => setMarca("Todas")}
                  >
                    {marca} <span aria-hidden="true">✕</span>
                  </button>
                )}
                <button className="shop-chip-clear" onClick={limpiarFiltros}>
                  Limpiar
                </button>
              </div>
            )}

            {/* Panel de filtros (colapsado por defecto, en móvil y escritorio) */}
            {filtrosOpen && (
              <div className="shop-filtros-panel">
                <div className="filter-group">
                  <span className="filter-label">Categoría</span>
                  <div className="filters">
                    <button
                      className={
                        "filter-btn" + (cat === "Todas" ? " active" : "")
                      }
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
                      className={
                        "filter-btn" + (marca === "Todas" ? " active" : "")
                      }
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
                <div className="shop-filtros-actions">
                  <button
                    className="shop-filtros-limpiar"
                    onClick={limpiarFiltros}
                  >
                    Limpiar
                  </button>
                  <button
                    className="shop-filtros-ver"
                    onClick={() => setFiltrosOpen(false)}
                  >
                    Ver {filtrados.length} productos
                  </button>
                </div>
              </div>
            )}

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
                No encontramos productos con esa búsqueda o filtros. Prueba con
                otra palabra o quita algún filtro.
              </p>
            )}
          </>
        )}
      </section>
    </main>
  );
}
