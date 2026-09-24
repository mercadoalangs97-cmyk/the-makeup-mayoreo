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
    generado: new Date().toISOString(),
  });
}
