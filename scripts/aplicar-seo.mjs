// ============================================================
//  Aplica contenido SEO (nombre_seo + notas) a la tabla productos.
//  Lee un JSON { "SKU": { "nombre_seo": "...", "notas": "..." }, ... }
//
//  USO:
//    node scripts/aplicar-seo.mjs                      -> DRY RUN (no escribe)
//    node scripts/aplicar-seo.mjs --go                 -> ejecuta
//    node scripts/aplicar-seo.mjs --file=otro.json --go
//
//  NO toca SKU ni stock. Solo escribe nombre_seo y notas.
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const GO = process.argv.includes("--go");
const fileArg = process.argv.find((a) => a.startsWith("--file="));
const FILE = fileArg ? fileArg.split("=")[1] : "scripts/seo-content.json";

function loadEnvLocal() {
  const env = {};
  const raw = readFileSync(join(ROOT, ".env.local"), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = loadEnvLocal();
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("❌ Falta URL o SERVICE KEY en .env.local");
  process.exit(1);
}

const contenido = JSON.parse(readFileSync(join(ROOT, FILE), "utf8"));
const skus = Object.keys(contenido);

console.log("\n" + "=".repeat(56));
console.log(GO ? "  MODO: EJECUCIÓN REAL (--go)" : "  MODO: PRUEBA (dry-run)");
console.log("  Archivo:", FILE, "·", skus.length, "productos");
console.log("=".repeat(56) + "\n");

const supabase = createClient(URL, KEY, {
  auth: { persistSession: false },
});

let ok = 0;
const fallas = [];
const noEncontrados = [];

for (const sku of skus) {
  const { nombre_seo, notas } = contenido[sku];
  // validar contra "100% original" / "importado"
  const txt = ((nombre_seo || "") + " " + (notas || "")).toLowerCase();
  if (txt.includes("importad") || txt.includes("100% original") || txt.includes("ee.uu")) {
    fallas.push(`${sku}: contiene 'importado/100% original/EE.UU.' — revisar`);
    continue;
  }
  if (!GO) {
    ok++;
    continue;
  }
  const { data, error } = await supabase
    .from("productos")
    .update({ nombre_seo, notas })
    .eq("sku", sku)
    .select("sku");
  if (error) {
    fallas.push(`${sku}: ${error.message}`);
  } else if (!data || data.length === 0) {
    noEncontrados.push(sku);
  } else {
    ok++;
  }
}

console.log(`✅ ${GO ? "Actualizados" : "Se actualizarían"}: ${ok}/${skus.length}`);
if (noEncontrados.length) {
  console.log(`⚠️  SKU no encontrados (${noEncontrados.length}): ${noEncontrados.join(", ")}`);
}
if (fallas.length) {
  console.log(`❌ Fallas (${fallas.length}):`);
  fallas.forEach((f) => console.log("   " + f));
}
if (!GO) console.log("\n👉 Para ejecutar: node scripts/aplicar-seo.mjs --go\n");
