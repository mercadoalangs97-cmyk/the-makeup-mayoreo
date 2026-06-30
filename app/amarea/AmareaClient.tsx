"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { fmx } from "../lib/lotes";
import { useCart } from "../lib/cart";
import { imgOpt } from "../lib/img";
import { nombreDisplay, nombreCorto, type Producto } from "../lib/productos";

// Normaliza para búsqueda tolerante: minúsculas, sin acentos, signos → espacio.
// "L'Oréal" → "l oreal", "e.l.f." → "e l f".
function norm(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

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
  const [buscarOpen, setBuscarOpen] = useState<boolean>(false);
  const [filtrosDrawerOpen, setFiltrosDrawerOpen] = useState<boolean>(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // El botón 🔍 del encabezado (SiteHeader) abre/cierra esta barra de búsqueda.
  useEffect(() => {
    function onToggle() {
      setBuscarOpen((v) => {
        const nv = !v;
        if (nv) setTimeout(() => searchRef.current?.focus(), 60);
        return nv;
      });
    }
    window.addEventListener("amarea-toggle-search", onToggle);
    return () => window.removeEventListener("amarea-toggle-search", onToggle);
  }, []);

  // Índice de búsqueda: un texto normalizado por producto (con y sin espacios).
  const indice = useMemo(
    () =>
      productos.map((p) => {
        const spaced = norm(
          [
            nombreDisplay(p),
            p.nombre,
            p.marca,
            p.marcaNorm,
            p.variante,
            p.categoria,
            p.sku,
          ]
            .filter(Boolean)
            .join(" ")
        );
        return { p, spaced, compact: spaced.replace(/ /g, "") };
      }),
    [productos]
  );

  const qn = norm(query);
  const filtrados = useMemo(() => {
    let toks = qn ? qn.split(" ").filter((t) => t.length >= 2) : [];
    // Si solo quedaron letras sueltas (ej. "e.l.f"), usa la versión sin espacios.
    if (qn && toks.length === 0) toks = [qn.replace(/ /g, "")];
    return indice
      .filter(({ p, spaced, compact }) => {
        const okCat = cat === "Todas" || p.categoria === cat;
        const okMarca = marca === "Todas" || p.marcaNorm === marca;
        // Cada palabra de la búsqueda debe aparecer en algún campo del producto
        // (orden libre); con o sin espacios para casos como "elf" → "e.l.f".
        const okQ =
          toks.length === 0 ||
          toks.every((t) => spaced.includes(t) || compact.includes(t));
        return okCat && okMarca && okQ;
      })
      .map((x) => x.p);
  }, [indice, cat, marca, qn]);

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
        nombre: nombreCorto(p),
        precio: p.precio_mxn ?? 0,
        foto: imgOpt(p.foto, 200) ?? p.foto,
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
            {/* BUSCADOR (se abre desde el 🔍 del encabezado) */}
            {buscarOpen && (
              <div className="shop-searchbar">
                <span className="shop-search-ico" aria-hidden="true">
                  🔍
                </span>
                <input
                  ref={searchRef}
                  type="search"
                  className="shop-search-input"
                  placeholder="Buscar producto o marca…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Buscar productos"
                />
                <button
                  className="shop-search-clear"
                  onClick={() => {
                    setQuery("");
                    setBuscarOpen(false);
                  }}
                  aria-label="Cerrar búsqueda"
                >
                  ✕
                </button>
              </div>
            )}

            {/* TOOLBAR: ☰ filtros + conteo */}
            <div className="shop-toolbar">
              <button
                className="shop-filtros-btn"
                onClick={() => setFiltrosDrawerOpen(true)}
                aria-label="Abrir filtros"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
                Filtros
                {activos > 0 && (
                  <span className="shop-filtros-count">{activos}</span>
                )}
              </button>
              <span className="shop-count" style={{ margin: 0 }}>
                {filtrados.length}{" "}
                {filtrados.length === 1 ? "producto" : "productos"}
              </span>
            </div>

            {/* Chips de filtros / búsqueda activos */}
            {(activos > 0 || query.trim()) && (
              <div className="shop-chips">
                {query.trim() && (
                  <button className="shop-chip" onClick={() => setQuery("")}>
                    “{query.trim()}” <span aria-hidden="true">✕</span>
                  </button>
                )}
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
                <button
                  className="shop-chip-clear"
                  onClick={() => {
                    limpiarFiltros();
                    setQuery("");
                  }}
                >
                  Limpiar
                </button>
              </div>
            )}

            {/* DRAWER lateral de filtros (al tocar ☰) */}
            <div
              className={
                "shop-filtros-overlay" + (filtrosDrawerOpen ? " open" : "")
              }
              onClick={() => setFiltrosDrawerOpen(false)}
            ></div>
            <aside
              className={
                "shop-filtros-drawer" + (filtrosDrawerOpen ? " open" : "")
              }
            >
              <div className="shop-filtros-drawer-head">
                <span className="serif">Filtros</span>
                <button
                  className="shop-filtros-x"
                  onClick={() => setFiltrosDrawerOpen(false)}
                  aria-label="Cerrar filtros"
                >
                  ✕
                </button>
              </div>
              <div className="shop-filtros-drawer-body">
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
              </div>
              <div className="shop-filtros-drawer-foot">
                <button
                  className="shop-filtros-limpiar"
                  onClick={limpiarFiltros}
                >
                  Limpiar
                </button>
                <button
                  className="shop-filtros-ver"
                  onClick={() => setFiltrosDrawerOpen(false)}
                >
                  Ver {filtrados.length} productos
                </button>
              </div>
            </aside>

            {/* GRID */}
            <div className="prod-grid">
              {filtrados.map((p) => {
                const nombre = nombreDisplay(p);
                const corto = nombreCorto(p);
                return (
                  <div key={p.sku} className="prod-card">
                    <Link href={`/amarea/${p.sku}`} className="prod-link">
                      <div className="prod-img">
                        {p.foto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imgOpt(p.foto, 420)}
                            alt={nombre}
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="prod-img-ph">💄</div>
                        )}
                      </div>
                      <div className="prod-marca">{p.marcaNorm}</div>
                      <div className="prod-nombre" title={nombre}>
                        {corto}
                      </div>
                      {/* Nombre SEO completo en el HTML para Google (no visible) */}
                      <span className="seo-only">{nombre}</span>
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
