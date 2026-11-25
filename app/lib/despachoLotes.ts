import { createAdminSupabase } from "./supabase";

// Ver app/api/despacho/lotes/route.ts: qué lote con foto escogió la clienta de cada pedido.
export type LoteFoto = { id: string; nombre: string | null; piezas: number | null; descripcion: string | null; fotos: string[] };

export async function lotesDePedidos(entrada: string[]): Promise<Record<string, LoteFoto[]>> {
  const ids = [...new Set(entrada.map(String).filter((x) => /^[0-9a-f-]{8,40}$/i.test(x)))].slice(0, 100);
  if (!ids.length) return {};
  const sb = createAdminSupabase();
  const { data: ords } = await sb.from("ordenes_web").select("id,items,envio").in("id", ids);
  const cotDe = new Map<string, string>();
  const refsDe = new Map<string, Set<string>>();
  for (const o of ords || []) {
    const cot = String(((o.envio || {}) as Record<string, unknown>).cotizacion || "").trim();
    if (cot) cotDe.set(o.id, cot);
    const refs = new Set<string>();
    for (const it of (o.items || []) as Array<{ nombre?: string; ref?: string }>) {
      for (const m of `${it.nombre || ""} ${it.ref || ""}`.matchAll(/\bL-\d{3,5}\b/gi)) refs.add(m[0].toUpperCase());
    }
    refsDe.set(o.id, refs);
  }
  const cots = [...new Set(cotDe.values())];
  const [{ data: porLink }, { data: mkCots }] = await Promise.all([
    sb
      .from("mk_lotes")
      .select("id,nombre,piezas,descripcion,fotos,orden_id,cotizacion_id")
      .or([`orden_id.in.(${ids.join(",")})`, cots.length ? `cotizacion_id.in.(${cots.join(",")})` : ""].filter(Boolean).join(",")),
    cots.length ? sb.from("mk_cotizaciones").select("id,lote_id").in("id", cots) : Promise.resolve({ data: [] as { id: string; lote_id: string | null }[] }),
  ]);
  const loteDeCot = new Map((mkCots || []).filter((c) => c.lote_id).map((c) => [c.id, String(c.lote_id)]));

  // Ids de lote que hay que leer además de los ya encontrados por vínculo.
  const extra = new Set<string>();
  for (const id of ids) {
    const c = cotDe.get(id);
    if (c && loteDeCot.get(c)) extra.add(loteDeCot.get(c)!);
    refsDe.get(id)?.forEach((r) => extra.add(r));
  }
  const yaLeidos = new Set((porLink || []).map((l) => l.id));
  const faltan = [...extra].filter((x) => !yaLeidos.has(x));
  const { data: porId } = faltan.length
    ? await sb.from("mk_lotes").select("id,nombre,piezas,descripcion,fotos,orden_id,cotizacion_id").in("id", faltan)
    : { data: [] as typeof porLink };
  const todos = [...(porLink || []), ...(porId || [])];

  const out: Record<string, LoteFoto[]> = {};
  for (const id of ids) {
    const c = cotDe.get(id);
    const quiero = new Set<string>();
    for (const l of todos) if (l.orden_id === id || (c && l.cotizacion_id === c)) quiero.add(l.id);
    if (c && loteDeCot.get(c)) quiero.add(loteDeCot.get(c)!);
    refsDe.get(id)?.forEach((r) => quiero.add(r));
    const lista = todos
      .filter((l) => quiero.has(l.id))
      .filter((l, i, a) => a.findIndex((x) => x.id === l.id) === i)
      .map((l) => ({
        id: l.id,
        nombre: l.nombre ?? null,
        piezas: l.piezas ?? null,
        descripcion: l.descripcion ?? null,
        fotos: (Array.isArray(l.fotos) ? l.fotos : [])
          .map((f: unknown) => (typeof f === "string" ? f : String((f as { url?: string })?.url || "")))
          .filter((u: string) => /^https:\/\//.test(u))
          .slice(0, 6),
      }));
    if (lista.length) out[id] = lista;
  }
  return out;
}
