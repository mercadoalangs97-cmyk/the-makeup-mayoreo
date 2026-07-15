import { NextResponse } from "next/server";
import { createAdminSupabase } from "../../lib/supabase";

// Guarda un suscriptor (WhatsApp O correo, el cliente elige) y devuelve el
// código de bienvenida. La lista NO es pública (RLS bloquea anon).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { via?: string; whatsapp?: string; email?: string; nombre?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const via = body.via === "email" ? "email" : "whatsapp";
  const whatsapp = (body.whatsapp || "").replace(/\D/g, "");
  const email = (body.email || "").trim().toLowerCase();
  const nombre = (body.nombre || "").trim().slice(0, 80);

  // Validamos SOLO el dato que eligió el cliente.
  if (via === "whatsapp") {
    if (whatsapp.length !== 10) {
      return NextResponse.json(
        { error: "Escribe tu WhatsApp a 10 dígitos." },
        { status: 400 }
      );
    }
  } else {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Escribe un correo válido." },
        { status: 400 }
      );
    }
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

  const row: Record<string, unknown> = { nombre: nombre || null, fuente: "popup" };
  if (via === "whatsapp") row.whatsapp = whatsapp;
  else row.email = email;

  const { error } = await sb
    .from("suscriptores")
    .upsert(row, { onConflict: via });
  if (error) {
    return NextResponse.json(
      { error: "No se pudo guardar. Intenta de nuevo." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, codigo });
}
