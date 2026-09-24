// Acceso del BOT vendedor (Telegram/WhatsApp) a las rutas que antes solo
// aceptaban la sesión del panel. El bot corre en Railway sin usuario de
// Supabase Auth: se identifica con un secreto compartido (env BOT_SECRET),
// en el header `x-bot-secret` o en el cuerpo como `botSecret`. Si BOT_SECRET
// no está configurado en Vercel, el bot simplemente no entra.
import { timingSafeEqual } from "node:crypto";

export type UsuarioBot = { id: "bot"; email: string; esBot: true };

export function esBotAutorizado(req: Request, body?: { botSecret?: unknown } | null): boolean {
  const esperado = process.env.BOT_SECRET || "";
  if (esperado.length < 16) return false;
  const dado = String(req.headers.get("x-bot-secret") || body?.botSecret || "");
  if (!dado || dado.length !== esperado.length) return false;
  try {
    return timingSafeEqual(Buffer.from(dado), Buffer.from(esperado));
  } catch {
    return false;
  }
}

/** Quién firma lo que hace el bot (`creada_por`). `creadaPor` lo manda el bot para distinguir conversaciones (bot:tg:123). */
export function usuarioBot(creadaPor?: unknown): UsuarioBot {
  const quien = String(creadaPor || "").replace(/[^a-zA-Z0-9:_.\-@]/g, "").slice(0, 60);
  return { id: "bot", email: quien && quien.startsWith("bot") ? quien : "bot:makeup", esBot: true };
}
