import { NextResponse } from "next/server";
import { createAdminSupabase, createServerSupabase } from "../../../lib/supabase";
import { loteFisicoOcupado } from "../../../lib/cotItems";
import { esBotAutorizado } from "../../../lib/botAuth";

// APARTADO POR TRANSFERENCIA (Alan, 23-oct-2026: el apartado de los lotes es SOLO por transferencia).
// La clienta transfiere el 5 % con los datos de su link y avisa; alguien del equipo revisa el banco y
// lo confirma aquí (el bot desde Telegram con x-bot-secret, o el panel con su sesión). Igual que el
// apartado de Mercado Pago, NO crea orden ni descuenta inventario: solo anota el anticipo, y el bot
// aparta el lote con foto 5 días y le avisa a la clienta.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Mismo cálculo que la página del link: 5 % del total, mínimo $100. */
function anticipoDe(total: number): number {
  return Math.max(100, Math.ceil(total * 0.05));
}

async function usuarioValido(token: string | undefined) {
  if (!token) return null;
  try {
    const { data, error } = await createServerSupabase().auth.getUser(token);
    return error || !data?.user ? null : data.user;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  let body: { id?: string; monto?: number; referencia?: string; token?: string; botSecret?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (!esBotAutorizado(req, body) && !(await usuarioValido(body.token))) {
    return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  }
  const id = (body.id || "").trim().toUpperCase();
  if (!id) return NextResponse.json({ error: "Falta la cotización" }, { status: 400 });

  const sb = createAdminSupabase();
  const { data: cot } = await sb
    .from("cotizaciones")
    .select("id,total,pagada,items,apartado_monto,apartado_pago_id")
    .eq("id", id)
    .maybeSingle();
  if (!cot) return NextResponse.json({ error: "Cotización no encontrada." }, { status: 404 });
  if (cot.pagada) return NextResponse.json({ error: "Esta cotización ya está pagada." }, { status: 409 });
  if (Number(cot.apartado_monto) > 0) {
    return NextResponse.json({ ok: true, yaApartada: true, monto: Number(cot.apartado_monto) });
  }
  const ocupado = await loteFisicoOcupado(cot);
  if (ocupado) return NextResponse.json({ error: ocupado }, { status: 409 });

  const monto = Number(body.monto) > 0 ? Math.round(Number(body.monto)) : anticipoDe(Number(cot.total) || 0);
  const ref = String(body.referencia || "").trim().slice(0, 60);
  const { error } = await sb
    .from("cotizaciones")
    .update({ apartado_monto: monto, apartado_en: Date.now(), apartado_pago_id: `SPEI:${ref || "confirmado"}` })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, monto });
}
