import { NextResponse } from "next/server";
import { META_PIXEL_ID } from "../../../lib/analytics";

// Revisión de la Conversions API de Meta. NO expone el token: solo dice si
// existe y si Meta lo acepta. Protegido con CRON_SECRET porque revela cómo
// está configurada la cuenta.
//
// Sin ?probe=1 hace una lectura (no manda ningún evento, no ensucia datos).
// Con ?probe=1&test=TESTXXXX manda un Purchase de prueba a "Probar eventos"
// de Events Manager, que NO cuenta en los datos reales.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function autorizado(req: Request): boolean {
  const secret = process.env.CRON_SECRET || "";
  if (!secret) return false;
  const auth = req.headers.get("authorization") || "";
  const qs = new URL(req.url).searchParams.get("secret") || "";
  return auth === `Bearer ${secret}` || qs === secret;
}

export async function GET(req: Request) {
  if (!autorizado(req)) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }

  const token = process.env.META_CAPI_TOKEN || "";
  const url = new URL(req.url);
  const probe = url.searchParams.get("probe") === "1";
  const testCode = url.searchParams.get("test") || "";

  const estado: Record<string, unknown> = {
    pixelId: META_PIXEL_ID || null,
    tokenPresente: Boolean(token),
    // Huella para confirmar que es el token NUEVO sin revelarlo.
    tokenLargo: token.length || 0,
    tokenTermina: token ? token.slice(-4) : null,
  };

  if (!token || !META_PIXEL_ID) {
    estado.veredicto = "Falta configurar META_CAPI_TOKEN o el pixel.";
    return NextResponse.json(estado);
  }

  // 1) Lectura: ¿Meta acepta este token para ESTE pixel?
  try {
    const r = await fetch(
      `https://graph.facebook.com/v21.0/${META_PIXEL_ID}?fields=id,name&access_token=${encodeURIComponent(token)}`
    );
    const j = (await r.json()) as {
      id?: string;
      name?: string;
      error?: { message?: string; type?: string; code?: number };
    };
    estado.lectura = r.ok
      ? { ok: true, pixel: j.name || j.id }
      : { ok: false, error: j.error?.message, code: j.error?.code };
  } catch (e) {
    estado.lectura = { ok: false, error: String(e) };
  }

  // 2) Escritura (opcional): manda un evento de prueba.
  if (probe) {
    const evento: Record<string, unknown> = {
      event_name: "Purchase",
      event_time: Math.floor(Date.now() / 1000),
      event_id: "diagnostico_" + Date.now(),
      action_source: "website",
      user_data: {
        // Correo inventado solo para la prueba; nunca es de una clienta real.
        em: "6f3b8c6a1d2e4f5a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a",
      },
      custom_data: { currency: "MXN", value: 1 },
    };
    const cuerpo: Record<string, unknown> = { data: [evento] };
    if (testCode) cuerpo.test_event_code = testCode;

    try {
      const r = await fetch(
        `https://graph.facebook.com/v21.0/${META_PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cuerpo),
        }
      );
      const j = await r.json();
      estado.escritura = { ok: r.ok, respuesta: j };
      estado.aviso = testCode
        ? "Evento mandado a Probar eventos: NO cuenta en los datos reales."
        : "Sin código de prueba: este evento SÍ entra en los datos reales.";
    } catch (e) {
      estado.escritura = { ok: false, error: String(e) };
    }
  }

  const lect = estado.lectura as { ok?: boolean } | undefined;
  estado.veredicto = lect?.ok
    ? "Token válido para este pixel."
    : "Meta rechazó el token.";
  return NextResponse.json(estado);
}
