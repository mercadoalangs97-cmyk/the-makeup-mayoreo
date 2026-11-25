import { NextResponse } from "next/server";
import { createServerSupabase } from "../../../lib/supabase";
import { lotesDePedidos } from "../../../lib/despachoLotes";

// Despacho (panel de inventario): qué lote CON FOTO escogió la clienta de cada
// pedido, con sus fotos, para armarlo igualito. La tabla mk_lotes no se puede
// leer desde el navegador (RLS), por eso pasa por aquí con la sesión del panel.
//
// Cómo se encuentra el lote de un pedido, en orden:
//   1) mk_lotes con orden_id = pedido o cotizacion_id = su cotización
//   2) mk_cotizaciones.lote_id de su cotización (lo pone el bot al cotizar)
//   3) un "L-1234" escrito en el nombre de un renglón del pedido
// Si nada aplica es un lote armado a la medida: no hay foto.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const json = (d: unknown, s = 200) => NextResponse.json(d, { status: s, headers: CORS });
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
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
  let body: { token?: string; ids?: string[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }
  if (!(await usuarioValido(body.token))) return json({ error: "Sesión no válida." }, 401);
  return json({ lotes: await lotesDePedidos(body.ids || []) });
}

