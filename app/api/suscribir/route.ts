import { NextResponse } from "next/server";
import { createAdminSupabase } from "../../lib/supabase";

// Guarda un suscriptor (WhatsApp + nombre) y devuelve el código de bienvenida.
// La lista NO es pública (RLS bloquea anon; aquí usamos service role).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { whatsapp?: string; nombre?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const whatsapp = (body.whatsapp || "").replace(/\D/g, "");
  const nombre = (body.nombre || "").trim().slice(0, 80);
  if (whatsapp.length !== 10) {
    return NextResponse.json(
      { error: "Escribe tu WhatsApp a 10 dígitos." },
      { status: 400 }
    );
  }

  const sb = createAdminSupabase();

  // Código de bienvenida activo (si no hay, usamos el estándar).
  const { data: cup } = await sb
    .from("cupones")
    .select("codigo")
    .eq("codigo", "BIENVENIDA10")
    .eq("activo", true)
    .maybeSingle();
  const codigo = cup?.codigo || "BIENVENIDA10";

  const { error } = await sb
    .from("suscriptores")
    .upsert(
      { whatsapp, nombre: nombre || null, fuente: "popup" },
      { onConflict: "whatsapp" }
    );
  if (error) {
    return NextResponse.json(
      { error: "No se pudo guardar. Intenta de nuevo." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, codigo });
}
