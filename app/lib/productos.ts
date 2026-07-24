import {
  createServerSupabase,
  createAdminSupabase,
  supabasePublicConfigurado,
} from "./supabase";

export type Producto = {
  sku: string;
  nombre: string;
  nombre_seo: string | null; // nombre optimizado para SEO (conserva `nombre` original)
  marca: string | null;
  marcaNorm: string; // marca normalizada para filtro/display
  categoria: string | null;
  variante: string | null;
  precio_mxn: number | null;
  stock: number;
  stock_min: number | null;
  foto: string | null;
  notas: string | null;
  barcode: string | null; // GTIN/EAN/UPC — para Google Shopping (Merchant Center)
};

// Nombre que se muestra en la tienda: el optimizado si existe, si no el original.
export function nombreDisplay(p: {
  nombre_seo?: string | null;
  nombre: string;
}): string {
  return p.nombre_seo && p.nombre_seo.trim() ? p.nombre_seo.trim() : p.nombre;
}

// Nombre CORTO (catálogo y carrito): nombre original + variante/tono, sin el
// SEO largo. El nombre SEO sigue en la ficha y en el HTML para Google.
export function nombreCorto(p: {
  nombre: string;
  variante?: string | null;
}): string {
  return [p.nombre, p.variante].filter((x) => x && String(x).trim()).join(" · ");
}

const COLS =
  "sku,nombre,nombre_seo,marca,categoria,variante,precio_mxn,stock,stock_min,foto,notas,barcode";

// Las marcas vienen inconsistentes en la base (e.l.f. / e.l.f. Skin /
// Maybelline / Maybelline New York / L'Oreal Paris ...). Las agrupamos.
export function normalizaMarca(raw: string | null): string {
  const s = (raw || "").toLowerCase();
  if (s.includes("e.l.f")) return "e.l.f.";
  if (s.includes("l'or") || s.includes("loreal") || s.includes("l'oreal"))
    return "L'Oréal";
  if (s.includes("maybelline")) return "Maybelline";
  if (s.includes("nyx")) return "NYX";
  if (s.includes("pixi")) return "Pixi";
  if (s.includes("neutrogena")) return "Neutrogena";
  if (s.includes("starface") || s === "sta") return "Starface";
  if (s.includes("hero")) return "Hero Cosmetics";
  if (s.includes("milani")) return "Milani";
  return raw || "Otras";
}

// Orden preferido de categorias en los filtros (las demas van al final).
const ORDEN_CATEGORIAS = ["Rostro", "Base", "Labios", "Ojos", "Cejas", "Contorno"];

export function ordenarCategorias(cats: string[]): string[] {
  return [...cats].sort((a, b) => {
    const ia = ORDEN_CATEGORIAS.indexOf(a);
    const ib = ORDEN_CATEGORIAS.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b);
  });
}

// Trae los productos elegibles para la tienda AMARÉA:
// con foto del bucket product-photos Y stock > 0.
export async function fetchProductosTienda(): Promise<{
  productos: Producto[];
  error: string | null;
}> {
  if (!supabasePublicConfigurado()) {
    return {
      productos: [],
      error:
        "Falta NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local (lectura de catalogo).",
    };
  }
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("productos")
    .select(COLS)
    .like("foto", "%product-photos%")
    .gt("stock", 0)
    .order("categoria", { ascending: true })
    .order("nombre", { ascending: true });

  if (error) {
    return { productos: [], error: error.message };
  }

  const productos: Producto[] = (data ?? []).map((p) => ({
    ...p,
    marcaNorm: normalizaMarca(p.marca),
  }));
  return { productos, error: null };
}

export async function fetchProductoPorSku(
  sku: string
): Promise<{ producto: Producto | null; error: string | null }> {
  if (!supabasePublicConfigurado()) {
    return { producto: null, error: "Supabase no configurado." };
  }
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("productos")
    .select(COLS)
    .eq("sku", sku)
    .maybeSingle();

  if (error) return { producto: null, error: error.message };
  if (!data) return { producto: null, error: null };
  return { producto: { ...data, marcaNorm: normalizaMarca(data.marca) }, error: null };
}

// Galería de la ficha: todas las fotos del producto en el bucket, nombradas
// {SKU}-1, {SKU}-2, … Devuelve las URLs públicas ordenadas (la principal primero).
// Se ejecuta SOLO server-side (usa la service key para listar el bucket).
export async function fetchFotosProducto(
  sku: string,
  fotoPrincipal: string | null
): Promise<string[]> {
  const fallback = fotoPrincipal ? [fotoPrincipal] : [];
  try {
    const sb = createAdminSupabase();
    const { data } = await sb.storage
      .from("product-photos")
      .list("", { limit: 100, search: sku });
    if (!data || data.length === 0) return fallback;

    const esc = sku.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(`^${esc}-(\\d+)\\.(jpe?g|png|webp)$`, "i");
    const urls = data
      .map((f) => ({ n: f.name, m: f.name.match(rx) }))
      .filter((x) => x.m)
      .sort((a, b) => parseInt(a.m![1], 10) - parseInt(b.m![1], 10))
      .map(
        (x) =>
          sb.storage.from("product-photos").getPublicUrl(x.n).data.publicUrl
      );
    if (urls.length === 0) return fallback;

    // La foto "principal" (columna foto) va primero.
    if (fotoPrincipal) {
      const i = urls.indexOf(fotoPrincipal);
      if (i > 0) urls.unshift(urls.splice(i, 1)[0]);
      else if (i === -1) urls.unshift(fotoPrincipal);
    }
    return urls;
  } catch {
    return fallback;
  }
}

// ---- Agrupación de variantes (tonos del MISMO producto) ----
// Clave = marca normalizada + nombre base (sin marca, sin acentos, sin
// espacios/puntuación). Conservador: no mezcla productos distintos.
function quitarMarcaDelNombre(s: string): string {
  return s
    .replace(/e\.?l\.?f\.?\s*(cosmetics|skin)?/g, " ")
    .replace(/l'?oreal(\s+paris)?/g, " ")
    .replace(/maybelline(\s+new\s+york)?/g, " ")
    .replace(/nyx(\s+professional\s+makeup)?/g, " ")
    .replace(/pixi(\s+by\s+petra)?/g, " ")
    .replace(/neutrogena/g, " ")
    .replace(/starface/g, " ")
    .replace(/hero\s+cosmetics/g, " ");
}

export function claveVariante(p: {
  nombre: string;
  marcaNorm: string;
}): string {
  let s = (p.nombre || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  s = quitarMarcaDelNombre(s).replace(/[^a-z0-9]/g, "");
  return (p.marcaNorm || "") + "|" + s;
}

// Tonos del mismo producto disponibles (el pool ya viene filtrado a stock > 0).
export function variantesDe(pool: Producto[], producto: Producto): Producto[] {
  const k = claveVariante(producto);
  return pool
    .filter((p) => claveVariante(p) === k)
    .sort((a, b) => (a.variante || "").localeCompare(b.variante || "", "es"));
}

// Categorias complementarias para "Completa tu look"
const COMPLEMENTOS: Record<string, string[]> = {
  Labios: ["Rostro", "Ojos", "Base"],
  Ojos: ["Labios", "Rostro", "Cejas"],
  Rostro: ["Labios", "Ojos", "Base"],
  Base: ["Rostro", "Labios", "Ojos"],
  Cejas: ["Ojos", "Rostro", "Labios"],
  Contorno: ["Rostro", "Labios", "Ojos"],
};

// A partir de un pool de productos calcula relacionados y "completa tu look".
export function extrasFicha(
  pool: Producto[],
  producto: Producto
): { relacionados: Producto[]; completaTuLook: Producto[] } {
  const claveActual = claveVariante(producto);
  const otros = pool.filter((p) => p.sku !== producto.sku);

  // Relacionados: MISMA categoria, excluyendo los tonos del mismo producto
  // (esos ya aparecen en el selector). Mostramos UN producto por grupo de
  // variantes (no varios tonos del mismo), priorizando la misma marca.
  const candidatos = otros
    .filter(
      (p) =>
        p.categoria === producto.categoria && claveVariante(p) !== claveActual
    )
    .sort(
      (a, b) =>
        (b.marcaNorm === producto.marcaNorm ? 1 : 0) -
        (a.marcaNorm === producto.marcaNorm ? 1 : 0)
    );
  const relacionados: Producto[] = [];
  const clavesVistas = new Set<string>();
  for (const p of candidatos) {
    const k = claveVariante(p);
    if (clavesVistas.has(k)) continue; // un solo tono por producto
    clavesVistas.add(k);
    relacionados.push(p);
    if (relacionados.length >= 4) break;
  }

  // Completa tu look: categorias complementarias, variando categoria
  const usados = new Set(relacionados.map((p) => p.sku));
  const objetivo =
    COMPLEMENTOS[producto.categoria ?? ""] ??
    ["Labios", "Ojos", "Rostro"];
  const completaTuLook: Producto[] = [];
  const catsUsadas = new Set<string>();
  // primera pasada: una por categoria complementaria
  for (const cat of objetivo) {
    const cand = otros.find(
      (p) => !usados.has(p.sku) && p.categoria === cat
    );
    if (cand) {
      completaTuLook.push(cand);
      usados.add(cand.sku);
      catsUsadas.add(cat);
    }
    if (completaTuLook.length >= 3) break;
  }
  // rellenar si faltan
  if (completaTuLook.length < 3) {
    for (const p of otros) {
      if (completaTuLook.length >= 3) break;
      if (!usados.has(p.sku) && p.categoria !== producto.categoria) {
        completaTuLook.push(p);
        usados.add(p.sku);
      }
    }
  }

  return { relacionados, completaTuLook };
}
