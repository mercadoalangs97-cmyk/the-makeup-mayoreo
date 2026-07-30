import { NextResponse } from "next/server";
import { createAdminSupabase } from "../../lib/supabase";

// Consulta pública del estado de un pedido. Para proteger los datos, exige
// DOS piezas: el número de pedido (8 caracteres) Y el correo con el que compró.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { pedido?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const pedido = (body.pedido || "").trim().replace(/^#/, "").toLowerCase();
  const email = (body.email || "").trim().toLowerCase();

  if (pedido.length < 6 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Escribe tu número de pedido y el correo con el que compraste." },
      { status: 400 }
    );
  }

  const sb = createAdminSupabase();
  const { data } = await sb
    .from("ordenes_web")
    .select(
      "id, status, total, items, envio, creado_en, fecha_pago, preparado, enviado, enviado_en, guia_tracking, email"
    )
    .ilike("id", pedido + "%")
    .limit(5);

  const o = (data || []).find(
    (x) => String(x.email || "").trim().toLowerCase() === email
  );
  if (!o) {
    return NextResponse.json(
      { error: "No encontramos ese pedido con ese correo. Revisa los datos." },
      { status: 404 }
    );
  }

  const env = (o.envio || {}) as Record<string, unknown>;
  const pagado = String(o.status || "").startsWith("pagado");

  // Estado en lenguaje de la clienta, no del sistema.
  let etapa = 1;
  let texto = "Recibimos tu pedido, falta confirmar el pago.";
  if (pagado) {
    etapa = 2;
    texto = "¡Pago confirmado! Estamos preparando tu pedido.";
  }
  if (o.preparado) {
    etapa = 3;
    texto = "Tu pedido ya está empacado y listo para salir.";
  }
  if (o.enviado) {
    etapa = 4;
    texto = "Tu pedido va en camino 🚚";
  }

  return NextResponse.json({
    ok: true,
    pedido: String(o.id).slice(0, 8).toUpperCase(),
    etapa,
    texto,
    total: o.total,
    piezas: (o.items || []).length,
    fecha: o.fecha_pago || o.creado_en,
    enviado_en: o.enviado_en || null,
    guia: o.guia_tracking || null,
    guia_url: (env.guia_tracking_url as string) || null,
    paqueteria: (env.guia_paqueteria as string) || null,
  });
}
