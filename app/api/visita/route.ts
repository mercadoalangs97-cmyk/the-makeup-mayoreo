import { NextResponse } from "next/server";
import { createAdminSupabase } from "../../lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// De dónde llegó la visita. Se clasifica en el servidor para que el criterio
// viva en un solo lugar y no se pueda falsear desde el navegador.
function clasificar(refHost: string, gclid: boolean, utmSource: string, utmMedium: string) {
  if (gclid || (utmSource === "google" && utmMedium === "cpc")) return "google-ads";
  if (utmMedium === "cpc" || utmMedium === "ppc") return "otra-pauta";
  if (!refHost) return "directo";
  const h = refHost.toLowerCase();
  // Asistentes de IA (ChatGPT, Perplexity, Gemini, Copilot...). VA ANTES que
  // el bloque de Google: gemini.google.com contiene "google" y se clasificaria
  // mal como buscador. Hoy es el canal mas grande del sitio.
  if (
    h.includes("chatgpt") || h.includes("openai") ||
    h.includes("perplexity") || h.includes("claude") || h.includes("anthropic") ||
    h.includes("gemini") || h.includes("bard") || h.includes("copilot") ||
    h.includes("you.com") || h.includes("poe.com") || h.includes("phind")
  ) return "ia-asistente";
  if (h.includes("google")) return "google-organico";
  if (h.includes("bing") || h.includes("duckduckgo") || h.includes("yahoo")) return "bing-organico";
  if (h.includes("facebook") || h.includes("instagram") || h.includes("tiktok") || h.includes("fb.")) return "redes";
  if (h.includes("whatsapp") || h.includes("wa.me")) return "whatsapp";
  if (h.includes("themakeup.com.mx")) return "directo";
  return "referido";
}

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const landing = String(body.landing || "").slice(0, 300);
    const refHost = host(String(body.referrer || ""));

    // Los parámetros de campaña viajan en la primera URL que vio la persona.
    let gclid = false, utmSource = "", utmMedium = "";
    try {
      const q = new URL(landing, "https://www.themakeup.com.mx").searchParams;
      gclid = q.has("gclid") || q.has("gbraid") || q.has("wbraid");
      utmSource = (q.get("utm_source") || "").toLowerCase();
      utmMedium = (q.get("utm_medium") || "").toLowerCase();
    } catch {}

    const sb = createAdminSupabase();
    await sb.from("visitas").insert({
      fuente: clasificar(refHost, gclid, utmSource, utmMedium),
      ref_host: refHost || null,
      landing: landing.split("?")[0] || null,
      gclid,
    });
  } catch {
    // Medir nunca debe romperle el sitio a nadie.
  }
  return NextResponse.json({ ok: true });
}
