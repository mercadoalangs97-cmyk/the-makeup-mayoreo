// ============================================================
//  Carga de fotos SUELTAS (planas) de productos -> Supabase Storage
//  + actualiza la columna `foto` de la tabla `productos`.
//
//  Pon las fotos en una carpeta, nombradas por SKU:
//    EL-NEUT-119.png        (foto única / principal)
//    EL-NEUT-119-1.png      (principal, si tienes varias)
//    EL-NEUT-119-2.png      (ángulo extra)
//  El SKU puede tener guiones; el sufijo -1..-5 (un dígito) es el índice de foto.
//
//  USO:
//    node scripts/subir-fotos-nuevas.mjs           -> DRY RUN (no sube nada)
//    node scripts/subir-fotos-nuevas.mjs --go      -> EJECUCIÓN REAL
//    PHOTOS_DIR="ruta" node scripts/subir-fotos-nuevas.mjs   (cambiar carpeta)
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "fs";
import { join, extname, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const BUCKET = "product-photos";
const PHOTOS_DIR =
  process.env.PHOTOS_DIR ||
  "D:\\THE MAKEUP MAYOREO\\AMAREA PRODUCTOS\\fotos-nuevas";
const GO = process.argv.includes("--go");
const IMG_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function loadEnvLocal() {
  const env = {};
  const raw = readFileSync(join(ROOT, ".env.local"), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    env[m[1]] = val;
  }
  return env;
}
const env = loadEnvLocal();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) { console.error("Falta URL o SERVICE KEY en .env.local"); process.exit(1); }

const contentType = (ext) => ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";

// Parsear SKU + índice de un archivo plano. "EL-NEUT-119-2.png" -> {sku:"EL-NEUT-119", idx:2}
function parseArchivo(file) {
  const ext = extname(file).toLowerCase();
  if (!IMG_EXT.has(ext)) return null;
  const base = file.slice(0, -ext.length);
  const m = base.match(/-([1-5])$/);
  const idx = m ? parseInt(m[1], 10) : 1;
  const sku = m ? base.slice(0, m.index) : base;
  return { sku: sku.trim(), idx, ext, canonical: `${sku.trim()}-${idx}${ext}`, file };
}

function escanear() {
  const files = readdirSync(PHOTOS_DIR);
  const porSku = {};
  for (const f of files) {
    const p = parseArchivo(f);
    if (!p) continue;
    (porSku[p.sku] = porSku[p.sku] || []).push({ ...p, path: join(PHOTOS_DIR, f) });
  }
  return Object.entries(porSku).map(([sku, fotos]) => {
    fotos.sort((a, b) => a.idx - b.idx);
    return { sku, fotos, principal: fotos.find((x) => x.idx === 1) || fotos[0] };
  });
}

async function main() {
  console.log("\n" + "=".repeat(58));
  console.log(GO ? "  MODO: EJECUCIÓN REAL (--go)" : "  MODO: PRUEBA (dry-run) — no se sube nada");
  console.log("  Carpeta:", PHOTOS_DIR);
  console.log("  Bucket :", BUCKET);
  console.log("=".repeat(58) + "\n");

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const productos = escanear();
  const totalImg = productos.reduce((a, p) => a + p.fotos.length, 0);
  console.log(`📁 SKU detectados : ${productos.length}`);
  console.log(`🖼️  Imágenes      : ${totalImg}`);

  const { data: rows, error } = await supabase.from("productos").select("sku");
  if (error) { console.error("No pude leer productos:", error.message); process.exit(1); }
  const dbSkus = new Set(rows.map((r) => r.sku));

  let subidas = 0, actualizados = 0;
  const sinMatch = [], fallas = [];
  for (const p of productos) {
    if (!dbSkus.has(p.sku)) { sinMatch.push(p.sku); continue; } // no subir si el SKU no existe en la tabla
    for (const f of p.fotos) {
      if (!GO) { subidas++; continue; }
      try {
        const buf = readFileSync(f.path);
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(f.canonical, buf, { contentType: contentType(f.ext), upsert: true });
        if (upErr) throw upErr;
        subidas++;
      } catch (e) { fallas.push(`${f.canonical}: ${e.message || e}`); }
    }
    const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${p.principal.canonical}`;
    if (!GO) { actualizados++; continue; }
    const { error: updErr } = await supabase.from("productos").update({ foto: url }).eq("sku", p.sku);
    if (updErr) fallas.push(`UPDATE ${p.sku}: ${updErr.message}`); else actualizados++;
  }

  console.log("\n" + "=".repeat(58));
  console.log("  RESUMEN" + (GO ? "" : " (simulado)"));
  console.log("=".repeat(58));
  console.log(`🖼️  Fotos subidas         : ${subidas} / ${totalImg}`);
  console.log(`✅ Productos actualizados : ${actualizados}`);
  console.log(`⚠️  SKU sin match en DB    : ${sinMatch.length}${sinMatch.length ? " -> " + sinMatch.join(", ") : ""}`);
  if (fallas.length) { console.log(`❌ Fallas (${fallas.length}):`); fallas.forEach((x) => console.log("   " + x)); }
  console.log("=".repeat(58));
  console.log(GO ? "\n✅ Listo.\n" : "\n👉 Prueba. Para ejecutar: node scripts/subir-fotos-nuevas.mjs --go\n");
}
main().catch((e) => { console.error("Error:", e); process.exit(1); });
