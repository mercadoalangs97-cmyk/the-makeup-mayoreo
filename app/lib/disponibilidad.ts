import { createAdminSupabase } from "./supabase";

// Lotes marcados como AGOTADOS desde el panel. Los lotes viven en el codigo
// (LOTES en lotes.ts) porque su composicion es fija, pero la disponibilidad
// cambia todos los dias — asi que vive en la base y se controla desde el panel
// sin volver a desplegar el sitio.
//
// Se guarda como una sola fila en tmk_config_global, que es donde el panel ya
// guarda su configuracion compartida.
const CLAVE = "lotes_agotados";

export async function lotesAgotados(): Promise<string[]> {
  try {
    const sb = createAdminSupabase();
    const { data } = await sb
      .from("tmk_config_global")
      .select("valor")
      .eq("clave", CLAVE)
      .maybeSingle();
    if (!data?.valor) return [];
    const lista = JSON.parse(String(data.valor));
    return Array.isArray(lista) ? lista.map(String) : [];
  } catch {
    // Ante la duda, todo disponible: mejor vender de mas que apagar la tienda
    // por un fallo de lectura.
    return [];
  }
}

export async function loteAgotado(id: string): Promise<boolean> {
  if (!id) return false;
  const lista = await lotesAgotados();
  return lista.includes(String(id));
}
