// Skydropx Pro — auth OAuth2 (client credentials) y helpers. SOLO server-side.
const BASE = "https://pro.skydropx.com/api/v1";
const TOKEN_URL = `${BASE}/oauth/token`;

let cache: { token: string; exp: number } | null = null;

export function skydropxConfigurado(): boolean {
  const k = process.env.SKYDROPX_API_KEY || "";
  const s = process.env.SKYDROPX_SECRET_KEY || "";
  return k.length > 10 && s.length > 10 && !k.includes("PEGA-AQUI");
}

// Obtiene (y cachea) el access token de Skydropx.
export async function getSkydropxToken(): Promise<string> {
  if (cache && cache.exp > Date.now() + 60_000) return cache.token;
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: process.env.SKYDROPX_API_KEY,
      client_secret: process.env.SKYDROPX_SECRET_KEY,
    }),
  });
  if (!res.ok) throw new Error("Skydropx token error " + res.status);
  const j = await res.json();
  cache = {
    token: j.access_token,
    exp: Date.now() + (Number(j.expires_in) || 7200) * 1000,
  };
  return cache.token;
}

// Llamada autenticada a la API de Skydropx.
export async function skydropxFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const token = await getSkydropxToken();
  return fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
}

// ---- Dirección de ORIGEN (remitente) — para cotizar y generar guías ----
// area_level1 = estado, area_level2 = municipio, area_level3 = colonia.
export const ORIGEN = {
  nombre: "The Makeup",
  telefono: "5543813568",
  calle: "Bosque de checoslovaquia",
  numero: "78",
  cp: "57170",
  area_level1: "Estado de México",
  area_level2: "Nezahualcóyotl",
  area_level3: "Bosques de Aragón",
  // Referencia visible para el repartidor al recoger en el origen.
  // OJO: Skydropx exige MÁX 30 caracteres. (Ajustable por Alan, ≤30.)
  referencia: "Casa, llamar al llegar",
};

// Paquete típico de un pedido AMARÉA (ajustable después).
export const PAQUETE_DEFAULT = { length: 20, width: 15, height: 10, weight: 0.5 };

export type Paquete = { length: number; width: number; height: number; weight: number };

export type RateEnvio = {
  proveedor: string; // nombre visible (ej "FedEx")
  proveedorKey: string; // nombre máquina de Skydropx (ej "fedex")
  servicio: string;
  servicioCode: string; // código estable del servicio (para revalidar)
  total: number; // precio final con IVA
  dias: number | null;
  rateId: string;
};

// Paquetería única: SOLO Estafeta (cuenta configurada por la dueña).
// Se elige siempre la opción de Estafeta más barata (la lista va ordenada por precio).
// Si por cobertura Estafeta NO llegara a un domicilio, hay un respaldo abajo que
// muestra la más barata disponible para no perder la venta.
const PAQUETERIAS_PERMITIDAS = ["estafeta"];
const PAQUETERIAS_BLOQUEADAS = ["ampm"];

const normalizarKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// Filtra a Estafeta y ordena de menor a mayor precio (la más barata primero).
// Respaldo: si Estafeta no cubre ese destino, regresa hasta 3 de las más baratas
// disponibles (sin las bloqueadas) para no bloquear la compra.
export function filtrarPaqueterias(rates: RateEnvio[]): RateEnvio[] {
  const permitidas = rates
    .filter((r) => {
      const k = normalizarKey(r.proveedorKey);
      return PAQUETERIAS_PERMITIDAS.some((p) => k.includes(p));
    })
    .sort((a, b) => a.total - b.total);
  if (permitidas.length > 0) return permitidas;
  return rates
    .filter((r) => !PAQUETERIAS_BLOQUEADAS.some((b) => normalizarKey(r.proveedorKey).includes(b)))
    .sort((a, b) => a.total - b.total)
    .slice(0, 3);
}

// Cotiza el costo REAL de envío (USO INTERNO: registrar gasto / generar guía).
// Crea la cotización y hace polling hasta que las tarifas estén listas.
// Devuelve las tarifas exitosas ordenadas de más barata a más cara.
// NO genera guía (cotizar no cuesta).
export async function cotizarEnvioReal(
  destino: { cp: string; estado: string; ciudad: string; colonia: string },
  parcels: Paquete[] = [PAQUETE_DEFAULT]
): Promise<RateEnvio[]> {
  const crear = await skydropxFetch("/quotations", {
    method: "POST",
    body: JSON.stringify({
      quotation: {
        address_from: {
          country_code: "MX",
          postal_code: ORIGEN.cp,
          area_level1: ORIGEN.area_level1,
          area_level2: ORIGEN.area_level2,
          area_level3: ORIGEN.area_level3,
        },
        address_to: {
          country_code: "MX",
          postal_code: destino.cp,
          area_level1: destino.estado,
          area_level2: destino.ciudad,
          area_level3: destino.colonia,
        },
        parcels: parcels.length ? parcels : [PAQUETE_DEFAULT],
      },
    }),
  });
  if (!crear.ok) throw new Error("Skydropx cotización error " + crear.status);
  const q = await crear.json();
  const qid: string = q.id;
  let rates: Array<Record<string, unknown>> = q.rates || [];
  let completa: boolean = !!q.is_completed;

  // Polling hasta que la cotización esté COMPLETA (no cortar al primer éxito,
  // o se pierden paqueterías que responden más lento). Máx ~12s.
  for (let i = 0; i < 8 && !completa; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const res = await skydropxFetch("/quotations/" + qid);
    if (!res.ok) break;
    const j = await res.json();
    rates = j.rates || rates;
    completa = !!j.is_completed;
  }

  return rates
    .filter((r) => r.success)
    .map((r) => ({
      proveedor: String(r.provider_display_name ?? ""),
      proveedorKey: String(r.provider_name ?? r.provider_display_name ?? ""),
      servicio: String(r.provider_service_name ?? ""),
      servicioCode: String(r.provider_service_code ?? r.id ?? ""),
      total: Number(r.total),
      dias: r.days != null ? Number(r.days) : null,
      rateId: String(r.id ?? ""),
    }))
    .sort((a, b) => a.total - b.total);
}
