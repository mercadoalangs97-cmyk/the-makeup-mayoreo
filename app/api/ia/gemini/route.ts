import { NextResponse } from "next/server";
import { createServerSupabase } from "../../../lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Relay seguro para Gemini (sugerencia de precios de la app de inventario).
// La API key vive SOLO server-side (GEMINI_API_KEY en Vercel) — nunca en el
// navegador ni en tmk_config_global. CORS abierto pero protegido por el token de
// sesión Supabase (solo personal logueado). La key va en header, no en la URL.
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
  const KEY = process.env.GEMINI_API_KEY;
  if (!KEY) {
    return json(
      { error: "IA no configurada en el servidor (falta GEMINI_API_KEY)." },
      503
    );
  }

  let body: {
    token?: string;
    model?: string;
    contents?: unknown;
    generationConfig?: unknown;
    tools?: unknown;
    systemInstruction?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido." }, 400);
  }

  const user = await verificarUsuario(body.token);
  if (!user) return json({ error: "No autorizado. Inicia sesión." }, 401);

  if (!body.contents) return json({ error: "Falta 'contents'." }, 400);

  // Sanitiza el nombre del modelo (evita inyección en la URL).
  const model = (body.model || "gemini-2.5-flash-lite").replace(
    /[^a-zA-Z0-9.\-]/g,
    ""
  );
  const payload: Record<string, unknown> = { contents: body.contents };
  if (body.generationConfig) payload.generationConfig = body.generationConfig;
  if (body.tools) payload.tools = body.tools;
  if (body.systemInstruction) payload.systemInstruction = body.systemInstruction;

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
        body: JSON.stringify(payload),
      }
    );
    const data = await r.json();
    return json(data, r.status);
  } catch (e) {
    return json(
      { error: "Error llamando a Gemini: " + (e as Error).message },
      502
    );
  }
}
