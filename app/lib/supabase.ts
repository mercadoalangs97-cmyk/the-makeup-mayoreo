import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cliente PUBLICO (anon key) — SOLO lectura de catalogo.
// La anon key es publica por diseno (va en el bundle del cliente).
// La SERVICE KEY nunca se usa aqui; esa solo vive server-side en scripts/API routes.

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function supabasePublicConfigurado(): boolean {
  return Boolean(URL && ANON);
}

// Para Server Components (se crea uno por request).
export function createServerSupabase(): SupabaseClient {
  return createClient(URL ?? "", ANON ?? "", {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Singleton para el navegador (realtime de stock en la ficha de producto).
let browserClient: SupabaseClient | null = null;
export function getBrowserSupabase(): SupabaseClient {
  if (!browserClient) {
    browserClient = createClient(URL ?? "", ANON ?? "", {
      auth: { persistSession: false },
    });
  }
  return browserClient;
}
