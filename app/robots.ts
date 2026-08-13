import type { MetadataRoute } from "next";
import { SITE_URL } from "./lib/site";

// Todo abierto. Las reglas por bot van explícitas a propósito:
//  - Googlebot / Googlebot-Image / Storebot-Google / AdsBot-Google son las que
//    Merchant Center y Shopping revisan; si un día alguien añade un bloqueo
//    global, estas siguen dejando pasar lo que da de comer.
//  - Los bots de IA (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot…) se
//    permiten a propósito: bloquearlos es renunciar a salir en respuestas de
//    ChatGPT, Copilot y Perplexity, que es de donde queremos crecer.
const BOTS = [
  "Googlebot",
  "Googlebot-Image",
  "Storebot-Google",
  "AdsBot-Google",
  "Bingbot",
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "PerplexityBot",
  "Google-Extended",
  "Applebot",
  "Applebot-Extended",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      ...BOTS.map((userAgent) => ({ userAgent, allow: "/" })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
