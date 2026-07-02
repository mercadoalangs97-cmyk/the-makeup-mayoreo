"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { fmx } from "../lib/lotes";
import { useCart } from "../lib/cart";
import { imgOpt } from "../lib/img";
import { nombreDisplay, nombreCorto, type Producto } from "../lib/productos";

// Normaliza para búsqueda tolerante: minúsculas, sin acentos, signos → espacio.
function norm(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

type Orden = "destacados" | "precio-asc" | "precio-desc";
const PER_PAGE = 24;

export default function ShopClient({
  productos,
  categorias,
  marcas,
  error,
  modo = "catalogo",
}: {
  productos: Producto[];
  categorias: string[];
  marcas: string[];
  error: string | null;
  // "home" = landing informativa (destacados + botón a /amarea).
  // "catalogo" = /amarea, catálogo completo paginado con filtros.
  modo?: "home" | "catalogo";
}) {
  const { add } = useCart();
  const esHome = modo === "home";
  const [cat, setCat] = useState<string>("Todas");
  const [marca, setMarca] = useState<string>("Todas");
  const [query, setQuery] = useState<string>("");
  const [buscarOpen, setBuscarOpen] = useState<boolean>(false);
  const [filtrosDrawerOpen, setFiltrosDrawerOpen] = useState<boolean>(false);
  const [orden, setOrden] = useState<Orden>("destacados");
  const [pagina, setPagina] = useState<number>(1);
  const searchRef = useRef<HTMLInputElement>(null);

  // El botón 🔍 del encabezado abre/cierra la barra de búsqueda.
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

  // En el catálogo, si llegan con ?ver=filtros (desde "Categorías") abrimos el
  // panel de filtros automáticamente.
  useEffect(() => {
    if (
      !esHome &&
      typeof window !== "undefined" &&
      window.location.search.includes("ver=filtros")
    ) {
      setFiltrosDrawerOpen(true);
    }
  }, [esHome]);

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
    if (qn && toks.length === 0) toks = [qn.replace(/ /g, "")];
    return indice
      .filter(({ p, spaced, compact }) => {
        const okCat = cat === "Todas" || p.categoria === cat;
        const okMarca = marca === "Todas" || p.marcaNorm === marca;
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

  const sugMarcas = useMemo(() => {
    if (!qn) return [] as string[];
    return [...new Set(filtrados.map((p) => p.marcaNorm))].slice(0, 5);
  }, [filtrados, qn]);

  // DESTACADOS de la home: selección variada (una por marca, hasta 8). Lista
  // para pasar a "Más vendidos" reales cuando haya datos de ventas.
  const destacados = useMemo(() => {
    const porMarca = new Map<string, Producto>();
    for (const p of productos) {
      if (!porMarca.has(p.marcaNorm)) porMarca.set(p.marcaNorm, p);
    }
    const sel = [...porMarca.values()];
    if (sel.length < 8) {
      const ya = new Set(sel.map((p) => p.sku));
      for (const p of productos) {
        if (sel.length >= 8) break;
        if (!ya.has(p.sku)) sel.push(p);
      }
    }
    return sel.slice(0, 8);
  }, [productos]);

  const hayFiltro = query.trim().length > 0 || activos > 0;

  const ordenados = useMemo(() => {
    if (orden === "precio-asc")
      return [...filtrados].sort(
        (a, b) => (a.precio_mxn ?? Infinity) - (b.precio_mxn ?? Infinity)
      );
    if (orden === "precio-desc")
      return [...filtrados].sort(
        (a, b) => (b.precio_mxn ?? -Infinity) - (a.precio_mxn ?? -Infinity)
      );
    return filtrados;
  }, [filtrados, orden]);

  const totalPaginas = Math.max(1, Math.ceil(ordenados.length / PER_PAGE));
  const pagActual = Math.min(pagina, totalPaginas);
  const visibles = ordenados.slice((pagActual - 1) * PER_PAGE, pagActual * PER_PAGE);

  useEffect(() => {
    setPagina(1);
  }, [qn, cat, marca, orden]);

  function irPagina(n: number) {
    setPagina(n);
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "smooth" });
  }

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

  const renderCard = (p: Producto) => {
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
  };

  // Buscador + sugerencias (compartido por home y catálogo).
  const buscador = (
    <>
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
      {buscarOpen && query.trim() && (
        <div className="shop-suggest">
          {sugMarcas.length > 0 && (
            <div className="shop-suggest-marcas">
              <span className="shop-suggest-lbl">Marcas:</span>
              {sugMarcas.map((m) => (
                <Link
                  key={m}
                  href={`/amarea?ver=filtros`}
                  className="shop-chip"
                  onClick={() => setBuscarOpen(false)}
                >
                  {m}
                </Link>
              ))}
            </div>
          )}
          {filtrados.slice(0, 5).map((p) => (
            <Link
              key={p.sku}
              href={`/amarea/${p.sku}`}
              className="shop-suggest-item"
              onClick={() => setBuscarOpen(false)}
            >
              <div className="shop-suggest-thumb">
                {p.foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imgOpt(p.foto, 80)} alt="" loading="lazy" />
                ) : (
                  "💄"
                )}
              </div>
              <div className="shop-suggest-info">
                <div className="shop-suggest-name">{nombreCorto(p)}</div>
                <div className="shop-suggest-meta">{p.marcaNorm}</div>
              </div>
              <div className="shop-suggest-price serif">
                {p.precio_mxn ? fmx(p.precio_mxn) : ""}
              </div>
            </Link>
          ))}
          {filtrados.length === 0 && (
            <div className="shop-suggest-empty">
              Sin coincidencias para “{query.trim()}”.
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <main>
      {/* HERO. En la home es el aspiracional (aquí irá la imagen de modelo
          después); en el catálogo, un título compacto. */}
      {esHome ? (
        <section className="shop-hero">
          <div className="shop-hero-inner">
            <div className="shop-hero-eyebrow">
              AMAREA · Tus marcas favoritas
            </div>
            <h1 className="shop-hero-h1 serif">
              Las mejores marcas de beauty <em>a un clic</em>
            </h1>
            <p className="shop-hero-sub">
              e.l.f, NYX, Maybelline, L&apos;Oréal y más. Envío a todo México,
              con pago seguro.
            </p>
          </div>
        </section>
      ) : (
        <section className="shop-hero shop-hero-compact">
          <div className="shop-hero-inner">
            <h1 className="shop-hero-h1 serif">Todos los productos</h1>
            <p className="shop-hero-sub">
              Catálogo completo de AMAREA — filtra por categoría, marca y precio.
            </p>
          </div>
        </section>
      )}

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
        ) : esHome ? (
          /* ================= HOME: Destacados + botón a /amarea ================= */
          <>
            {buscador}
            <div className="shop-destacados-head">
              <h2 className="serif">⭐ Destacados</h2>
            </div>
            <div className="prod-grid">{destacados.map(renderCard)}</div>
            <div className="shop-vertodos-wrap">
              <Link href="/amarea" className="shop-vertodos-btn">
                Ver todos los productos →
              </Link>
            </div>
          </>
        ) : (
          /* ================= CATÁLOGO /amarea: todo paginado + filtros ========= */
          <>
            {buscador}

            {/* DRAWER lateral de filtros */}
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
                  <span className="filter-label">Ordenar por</span>
                  <div className="filters">
                    <button
                      className={
                        "filter-btn" + (orden === "destacados" ? " active" : "")
                      }
                      onClick={() => setOrden("destacados")}
                    >
                      Destacados
                    </button>
                    <button
                      className={
                        "filter-btn" + (orden === "precio-asc" ? " active" : "")
                      }
                      onClick={() => setOrden("precio-asc")}
                    >
                      Precio: menor a mayor
                    </button>
                    <button
                      className={
                        "filter-btn" + (orden === "precio-desc" ? " active" : "")
                      }
                      onClick={() => setOrden("precio-desc")}
                    >
                      Precio: mayor a menor
                    </button>
                  </div>
                </div>
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
                  Ver {ordenados.length} productos
                </button>
              </div>
            </aside>

            {/* TOOLBAR: filtros + orden + conteo */}
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
              <select
                className="shop-orden"
                value={orden}
                onChange={(e) => setOrden(e.target.value as Orden)}
                aria-label="Ordenar productos"
              >
                <option value="destacados">Ordenar por…</option>
                <option value="precio-asc">Precio: menor a mayor</option>
                <option value="precio-desc">Precio: mayor a menor</option>
              </select>
              <span className="shop-count" style={{ margin: 0 }}>
                {ordenados.length}{" "}
                {ordenados.length === 1 ? "producto" : "productos"}
              </span>
            </div>

            {/* Chips activos */}
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

            {/* GRID paginado */}
            <div className="prod-grid">{visibles.map(renderCard)}</div>

            {ordenados.length === 0 && (
              <p className="shop-empty">
                No encontramos productos con esa búsqueda o filtros. Prueba con
                otra palabra o quita algún filtro.
              </p>
            )}

            {/* Paginación */}
            {totalPaginas > 1 && (
              <div className="shop-paginacion">
                <button
                  disabled={pagActual <= 1}
                  onClick={() => irPagina(pagActual - 1)}
                >
                  ← Anterior
                </button>
                <span>
                  Página {pagActual} de {totalPaginas}
                </span>
                <button
                  disabled={pagActual >= totalPaginas}
                  onClick={() => irPagina(pagActual + 1)}
                >
                  Siguiente →
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
