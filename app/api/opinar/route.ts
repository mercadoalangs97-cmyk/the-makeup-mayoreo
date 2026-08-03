import { NextResponse } from "next/server";
import { createAdminSupabase } from "../../lib/supabase";

// Recibe la opinión de una clienta desde /opinar. Público (cualquiera con el
// link puede opinar), pero nada se publica en el sitio hasta que la dueña la
// marque como publicada desde la app de inventario.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: {
    nombre?: string;
    ciudad?: string;
    calificacion?: number;
    texto?: string;
    autoriza?: boolean;
    pedido?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const nombre = (body.nombre || "").trim().slice(0, 60);
  const ciudad = (body.ciudad || "").trim().slice(0, 60);
  const texto = (body.texto || "").trim().slice(0, 1200);
  const calificacion = Math.round(Number(body.calificacion) || 0);

  if (nombre.length < 2) {
    return NextResponse.json({ error: "Escribe tu nombre." }, { status: 400 });
  }
  if (calificacion < 1 || calificacion > 5) {
    return NextResponse.json({ error: "Elige de 1 a 5 estrellas." }, { status: 400 });
  }
  if (texto.length < 10) {
    return NextResponse.json(
      { error: "Cuéntanos aunque sea una frase (mínimo 10 letras)." },
      { status: 400 }
    );
  }

  const sb = createAdminSupabase();
  const { error } = await sb.from("opiniones").insert({
    orden_id: (body.pedido || "").trim().slice(0, 12) || null,
    nombre,
    ciudad: ciudad || null,
    calificacion,
    texto,
    autoriza: body.autoriza === true,
    creada_en: Date.now(),
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
