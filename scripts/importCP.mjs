// Importa el catálogo SEPOMEX (Swumplurd/cp-mexico, 32 JSON por estado)
// a la tabla public.codigos_postales en Supabase. Uso interno, una sola vez.
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const SB = env.NEXT_PUBLIC_SUPABASE_URL;
const SK = env.SUPABASE_SERVICE_ROLE_KEY;

const ESTADO_FIX = {
  "Coahuila de Zaragoza": "Coahuila",
  "Michoacán de Ocampo": "Michoacán",
  "Veracruz de Ignacio de la Llave": "Veracruz",
};

const API = "https://api.github.com/repos/Swumplurd/cp-mexico/contents/json";

async function main() {
  const files = await (await fetch(API, { headers: { "User-Agent": "node" } })).json();
  const urls = files.filter((f) => f.name.endsWith(".json")).map((f) => f.download_url);
  console.log("archivos:", urls.length);

  const filas = [];
  for (const u of urls) {
    const arr = await (await fetch(u)).json();
    for (const r of arr) {
      if (!r.d_codigo || !r.d_asenta) continue;
      filas.push({
        cp: String(r.d_codigo).padStart(5, "0"),
        colonia: r.d_asenta,
        municipio: r.D_mnpio || null,
        estado: ESTADO_FIX[r.d_estado] || r.d_estado,
        ciudad: r.d_ciudad || null,
      });
    }
  }
  console.log("filas a insertar:", filas.length);

  const BATCH = 2000;
  let ok = 0;
  for (let i = 0; i < filas.length; i += BATCH) {
    const lote = filas.slice(i, i + BATCH);
    const res = await fetch(`${SB}/rest/v1/codigos_postales`, {
      method: "POST",
      headers: {
        apikey: SK,
        Authorization: `Bearer ${SK}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(lote),
    });
    if (!res.ok) {
      console.log("ERROR batch", i, res.status, (await res.text()).slice(0, 200));
      break;
    }
    ok += lote.length;
    if ((i / BATCH) % 10 === 0) console.log("  insertadas:", ok, "/", filas.length);
  }
  console.log("LISTO. Insertadas:", ok);
}
main().catch((e) => console.log("ERR", e.message));
