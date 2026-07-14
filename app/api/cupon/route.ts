import { NextResponse } from "next/server";
import { createAdminSupabase } from "../../lib/supabase";

// Valida un código de cupón para MOSTRAR el descuento en el checkout.
// La aplicación REAL (fuente de verdad) se hace en /api/checkout al pagar.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { codigo?: string; telefono?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const codigo = (body.codigo || "").trim().toUpperCase();
  const telefono = (body.telefono || "").replace(/\D/g, "");
  if (!codigo) {
    return NextResponse.json({ error: "Escribe un código." }, { status: 400 });
  }

  const sb = createAdminSupabase();
  const { data: c } = await sb
    .from("cupones")
    .select("*")
    .eq("codigo", codigo)
    .eq("activo", true)
    .maybeSingle();
  if (!c) {
    return NextResponse.json(
      { error: `El código "${codigo}" no es válido o ya expiró.` },
      { status: 404 }
    );
  }

  // Una vez por WhatsApp: ¿ya hay una compra PAGADA con este código y número?
  if (c.una_vez_por_wpp && telefono.length === 10) {
    const { data: previa } = await sb
      .from("ordenes_web")
      .select("id")
      .eq("wpp", telefono)
      .eq("cupon", codigo)
      .eq("status", "pagado")
      .limit(1);
    if (previa && previa.length > 0) {
      return NextResponse.json(
        { error: "Este código ya se usó con este WhatsApp." },
        { status: 409 }
      );
    }
  }

  return NextResponse.json({
    ok: true,
    codigo: c.codigo,
    valor: Number(c.valor),
    solo_productos: !!c.solo_productos,
  });
}
