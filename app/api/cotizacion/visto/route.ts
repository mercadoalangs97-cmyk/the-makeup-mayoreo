import { NextResponse } from "next/server";
import { createAdminSupabase } from "../../../lib/supabase";

// Marca que la clienta ABRIÓ su cotización.
// Lo llama el navegador al cargar la página (no el servidor), a propósito: así
// la vista previa de WhatsApp —que descarga la página pero no ejecuta
// JavaScript— no cuenta como si la hubiera abierto.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let id = "";
  try {
    const body = await req.json();
    id = String(body?.id || "").trim().toUpperCase();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    const sb = createAdminSupabase();
    const { data } = await sb
      .from("cotizaciones")
      .select("vistas,vista_en")
      .eq("id", id)
      .maybeSingle();
    if (!data) return NextResponse.json({ ok: false }, { status: 404 });

    await sb
      .from("cotizaciones")
      .update({
        vistas: (data.vistas || 0) + 1,
        // vista_en = la PRIMERA vez que la abrió; no se pisa después.
        vista_en: data.vista_en ?? Date.now(),
      })
      .eq("id", id);
  } catch (e) {
    console.error("[cotizacion/visto]", e);
  }

  // Nunca rompemos la página de la clienta por un problema de medición.
  return NextResponse.json({ ok: true });
}
