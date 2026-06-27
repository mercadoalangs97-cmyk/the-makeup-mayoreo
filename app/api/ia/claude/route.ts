import { NextResponse } from "next/server";
import { createServerSupabase } from "../../../lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Relay seguro para Claude (reconocimiento de fotos de la app de inventario).
// La API key vive SOLO server-side (ANTHROPIC_API_KEY en Vercel) — nunca en el
// navegador ni en tmk_config_global. Mismo patrón que /api/envio/guia:
// CORS abierto (la app de inventario es otro dominio) pero SIEMPRE protegido por
// el token de sesión Supabase (solo personal logueado puede usar la IA).
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: CORS });
}
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

async function verificarUsuario(token: string | undefined) {
  if (!token) return null;
  try {
    const sb = createServerSupabase();
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const KEY = process.env.ANTHROPIC_API_KEY;
  if (!KEY) {
    return json(
      { error: "IA no configurada en el servidor (falta ANTHROPIC_API_KEY)." },
      503
    );
  }

  let body: {
    token?: string;
    model?: string;
    max_tokens?: number;
    messages?: unknown;
    system?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido." }, 400);
  }

  const user = await verificarUsuario(body.token);
  if (!user) return json({ error: "No autorizado. Inicia sesión." }, 401);

  if (!body.messages) return json({ error: "Falta 'messages'." }, 400);

  const payload: Record<string, unknown> = {
    model: body.model || "claude-opus-4-5",
    max_tokens: Math.min(Number(body.max_tokens) || 1000, 4000),
    messages: body.messages,
  };
  if (body.system) payload.system = body.system;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    return json(data, r.status);
  } catch (e) {
    return json(
      { error: "Error llamando a Claude: " + (e as Error).message },
      502
    );
  }
}
