import { createServerSupabase, supabasePublicConfigurado } from "./supabase";

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
};

// Nombre que se muestra en la tienda: el optimizado si existe, si no el original.
export function nombreDisplay(p: {
  nombre_seo?: string | null;
  nombre: string;
}): string {
  return p.nombre_seo && p.nombre_seo.trim() ? p.nombre_seo.trim() : p.nombre;
}

const COLS =
  "sku,nombre,nombre_seo,marca,categoria,variante,precio_mxn,stock,stock_min,foto,notas";

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

// Trae los productos elegibles para la tienda AMAREA:
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
  const otros = pool.filter((p) => p.sku !== producto.sku);

  // Relacionados: misma categoria o misma marca (priorizando ambos)
  const score = (p: Producto) =>
    (p.categoria === producto.categoria ? 2 : 0) +
    (p.marcaNorm === producto.marcaNorm ? 1 : 0);
  const relacionados = otros
    .filter((p) => score(p) > 0)
    .sort((a, b) => score(b) - score(a))
    .slice(0, 4);

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
