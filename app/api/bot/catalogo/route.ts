import { NextResponse } from "next/server";
import { createAdminSupabase } from "../../../lib/supabase";
import { LOTES, PPU_REFERENCIA } from "../../../lib/lotes";
import { lotesAgotados } from "../../../lib/disponibilidad";
import { esBotAutorizado } from "../../../lib/botAuth";

// Catálogo para el BOT vendedor: los lotes con su precio VIVO (viven en
// código, en lib/lotes.ts, y así no hay una segunda copia en el bot), cuáles
// están agotados, el stock total y los lotes personalizados publicados.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!esBotAutorizado(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const agotados = new Set(await lotesAgotados());
  let stockTotal = 0;
  let publicados: { id: string; nombre: string; piezas: number; precio: number; descripcion: string | null; foto: string | null }[] = [];
  try {
    const sb = createAdminSupabase();
    const [{ data: prods }, { data: pers }] = await Promise.all([
      sb.from("productos").select("stock").gt("stock", 0),
      sb.from("lotes_personalizados").select("id,nombre,piezas,precio,descripcion,foto").eq("publicado", true).limit(20),
    ]);
    stockTotal = (prods || []).reduce((s, p) => s + (Number(p.stock) || 0), 0);
    publicados = (pers || []).map((p) => ({
      id: String(p.id),
      nombre: String(p.nombre),
      piezas: Number(p.piezas) || 0,
      precio: Number(p.precio) || 0,
      descripcion: (p.descripcion as string | null) ?? null,
      foto: (p.foto as string | null) ?? null,
    }));
  } catch {
    // sin base: el catálogo de lotes sigue sirviendo
  }
  // Accesorios y cualquier producto suelto con precio por cantidad, agrupados
  // por familia: al bot no le sirve una lista de 10 SKUs, le sirve saber
  // "puffs, 3 colores, $40 o $29 desde 6 piezas".
  type Accesorio = {
    familia: string;
    nombre: string;
    colores: string[];
    precio: number;
    precioMayoreo: number;
    desde: number;
    nota: string | null;
    piezasDisponibles: number;
    foto: string | null;
  };
  let accesorios: Accesorio[] = [];
  try {
    const sb = createAdminSupabase();
    const { data } = await sb
      .from("productos")
      .select("sku,nombre,variante,precio_mxn,stock,foto,mayoreo_precio,mayoreo_desde,mayoreo_familia,mayoreo_nota")
      .not("mayoreo_familia", "is", null);
    const porFamilia = new Map<string, Accesorio>();
    for (const p of data || []) {
      const fam = String(p.mayoreo_familia || "").trim();
      if (!fam) continue;
      const ya = porFamilia.get(fam);
      const stock = Number(p.stock) || 0;
      if (ya) {
        if (p.variante) ya.colores.push(String(p.variante));
        ya.piezasDisponibles += stock;
        if (!ya.foto && p.foto) ya.foto = String(p.foto);
        continue;
      }
      porFamilia.set(fam, {
        familia: fam,
        nombre: String(p.nombre || fam),
        colores: p.variante ? [String(p.variante)] : [],
        precio: Number(p.precio_mxn) || 0,
        precioMayoreo: Number(p.mayoreo_precio) || 0,
        desde: Number(p.mayoreo_desde) || 0,
        nota: (p.mayoreo_nota as string | null) ?? null,
        piezasDisponibles: stock,
        foto: (p.foto as string | null) ?? null,
      });
    }
    accesorios = [...porFamilia.values()];
  } catch {
    // Si aun no existen las columnas de mayoreo, el resto del catalogo sirve igual.
  }

  return NextResponse.json({
    lotes: LOTES.map((l) => ({
      id: l.id,
      nombre: l.nombre,
      piezas: l.piezas,
      precio: l.precio,
      tipo: l.tipo,
      popular: l.popular,
      wppOnly: l.wppOnly,
      foto: l.foto,
      desc: l.desc,
      // Agotado por bandera del panel, o porque el inventario general no alcanza para armarlo.
      agotado: agotados.has(l.id) || (stockTotal > 0 && l.piezas > stockTotal),
    })),
    stockTotal,
    ppuReferencia: PPU_REFERENCIA,
    publicados,
    accesorios,
    generado: new Date().toISOString(),
  });
}
