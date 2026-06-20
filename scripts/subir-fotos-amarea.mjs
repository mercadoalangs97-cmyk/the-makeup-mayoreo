// ============================================================
//  Carga masiva de fotos de productos AMAREA -> Supabase Storage
//  + actualizacion de la columna `foto` en la tabla `productos`.
//
//  USO:
//    node scripts/subir-fotos-amarea.mjs           -> DRY RUN (no sube ni escribe nada)
//    node scripts/subir-fotos-amarea.mjs --go      -> EJECUCION REAL
//
//  Requiere un archivo .env.local en la raiz del proyecto con:
//    NEXT_PUBLIC_SUPABASE_URL=https://yekvehkmgunoafccwmyp.supabase.co
//    SUPABASE_SERVICE_ROLE_KEY=eyJ...   (la SERVICE KEY, secreta)
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ---- Config ----
const BUCKET = "product-photos";
const PHOTOS_DIR =
  process.env.PHOTOS_DIR ||
  "D:\\THE MAKEUP MAYOREO\\AMAREA PRODUCTOS\\AMAREA-productos";
const GO = process.argv.includes("--go"); // sin --go = dry run
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const ONLY = onlyArg ? onlyArg.split("=")[1].trim() : null; // procesar 1 solo SKU
const IMG_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

// ---- Cargar .env.local manualmente (sin dependencias) ----
function loadEnvLocal() {
  const env = {};
  let raw;
  try {
    raw = readFileSync(join(ROOT, ".env.local"), "utf8");
  } catch {
    console.error("\n❌ No encontre .env.local en la raiz del proyecto.");
    console.error("   Crealo con NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.\n");
    process.exit(1);
  }
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[m[1]] = val;
  }
  return env;
}

const env = loadEnvLocal();
const SUPABASE_URL =
  env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const SERVICE_KEY =
  env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("\n❌ Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local\n");
  process.exit(1);
}
if (SERVICE_KEY.length < 40 || SERVICE_KEY.includes("PEGA-AQUI")) {
  console.error("\n❌ La SERVICE KEY parece ser un placeholder. Pega la llave real en .env.local\n");
  process.exit(1);
}

const contentType = (ext) =>
  ext === ".png"
    ? "image/png"
    : ext === ".webp"
    ? "image/webp"
    : "image/jpeg";

// ---- 1. Escanear carpetas (cada carpeta = SKU) ----
function escanear() {
  const entries = readdirSync(PHOTOS_DIR, { withFileTypes: true });
  const productos = []; // { sku, fotos: [{path, canonical, idx, ext}], principal }
  const sinImagen = [];

  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const sku = e.name.trim();
    const dir = join(PHOTOS_DIR, e.name);
    const files = readdirSync(dir).filter((f) =>
      IMG_EXT.has(extname(f).toLowerCase())
    );
    if (files.length === 0) {
      sinImagen.push(sku);
      continue;
    }
    const fotos = files.map((f) => {
      const ext = extname(f).toLowerCase();
      const base = f.slice(0, -ext.length);
      // indice = guion + un solo digito 1-5 al final (los sufijos de SKU son de 3 digitos)
      const m = base.match(/-([1-5])$/);
      const idx = m ? parseInt(m[1], 10) : 1;
      return {
        path: join(dir, f),
        original: f,
        idx,
        ext,
        canonical: `${sku}-${idx}${ext}`,
      };
    });
    // ordenar por indice; principal = idx 1 (o el menor)
    fotos.sort((a, b) => a.idx - b.idx);
    const principal = fotos.find((x) => x.idx === 1) || fotos[0];
    productos.push({ sku, fotos, principal });
  }
  return { productos, sinImagen };
}

// ---- 2. Asegurar bucket publico ----
async function asegurarBucket(supabase) {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw new Error("listBuckets: " + error.message);
  const existe = buckets.find((b) => b.name === BUCKET);
  if (existe) {
    return { creado: false, publico: existe.public };
  }
  if (!GO) {
    return { creado: false, publico: null, faltante: true };
  }
  const { error: e2 } = await supabase.storage.createBucket(BUCKET, {
    public: true,
  });
  if (e2) throw new Error("createBucket: " + e2.message);
  return { creado: true, publico: true };
}

// ---- main ----
async function main() {
  console.log("\n" + "=".repeat(58));
  console.log(GO ? "  MODO: EJECUCION REAL (--go)" : "  MODO: PRUEBA (dry-run) — no se sube ni escribe nada");
  console.log("  Carpeta:", PHOTOS_DIR);
  console.log("  Bucket :", BUCKET);
  console.log("=".repeat(58) + "\n");

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let { productos, sinImagen } = escanear();
  if (ONLY) {
    productos = productos.filter((p) => p.sku === ONLY);
    sinImagen = [];
    if (productos.length === 0) {
      console.error(`\n❌ No encontre la carpeta/fotos del SKU "${ONLY}".\n`);
      process.exit(1);
    }
    console.log(`🎯 Modo 1 SOLO producto: ${ONLY}\n`);
  }
  const totalImagenes = productos.reduce((a, p) => a + p.fotos.length, 0);
  const multiFoto = productos.filter((p) => p.fotos.length > 1);

  console.log(`📁 Carpetas/SKU escaneados : ${productos.length + sinImagen.length}`);
  console.log(`🖼️  Imagenes encontradas     : ${totalImagenes}`);
  console.log(`   · SKUs con >1 foto       : ${multiFoto.length}`);
  console.log(`   · Carpetas SIN foto      : ${sinImagen.length}${sinImagen.length ? " -> " + sinImagen.join(", ") : ""}`);

  // Bucket
  let bucketInfo;
  try {
    bucketInfo = await asegurarBucket(supabase);
  } catch (err) {
    console.error("\n❌ Error con el bucket:", err.message, "\n");
    process.exit(1);
  }
  if (bucketInfo.faltante) {
    console.log(`\n⚠️  El bucket "${BUCKET}" NO existe. En la ejecucion real (--go) lo creare PUBLICO.`);
  } else if (bucketInfo.creado) {
    console.log(`\n✅ Bucket "${BUCKET}" creado (publico).`);
  } else {
    console.log(`\n✅ Bucket "${BUCKET}" ya existe (publico: ${bucketInfo.publico}).`);
    if (bucketInfo.publico === false) {
      console.log("   ⚠️  El bucket NO es publico; las URLs publicas no funcionaran hasta hacerlo publico.");
    }
  }

  // ---- Traer SKUs de la tabla productos ----
  const { data: rows, error: selErr } = await supabase
    .from("productos")
    .select("sku");
  if (selErr) {
    console.error("\n❌ No pude leer la tabla productos:", selErr.message, "\n");
    process.exit(1);
  }
  const dbSkus = new Set(rows.map((r) => r.sku));
  console.log(`\n🗄️  Productos en la tabla    : ${dbSkus.size}`);

  // ---- Subida + update ----
  let subidas = 0;
  let actualizados = 0;
  const fallasSubida = [];
  const fotosSinMatch = []; // carpeta con foto pero su SKU no esta en la tabla
  const folderSkus = new Set();

  for (const p of productos) {
    folderSkus.add(p.sku);
    const enDB = dbSkus.has(p.sku);
    if (!enDB) fotosSinMatch.push(p.sku);

    for (const f of p.fotos) {
      if (!GO) {
        subidas++; // en dry-run contamos lo que se subiria
        continue;
      }
      try {
        const buf = readFileSync(f.path);
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(f.canonical, buf, {
            contentType: contentType(f.ext),
            upsert: true,
          });
        if (upErr) throw upErr;
        subidas++;
      } catch (err) {
        fallasSubida.push(`${f.canonical}: ${err.message || err}`);
      }
    }

    // actualizar columna foto con la principal, solo si el SKU existe en la tabla
    if (enDB) {
      const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${p.principal.canonical}`;
      if (!GO) {
        actualizados++;
        continue;
      }
      const { error: updErr } = await supabase
        .from("productos")
        .update({ foto: url })
        .eq("sku", p.sku);
      if (updErr) {
        fallasSubida.push(`UPDATE ${p.sku}: ${updErr.message}`);
      } else {
        actualizados++;
      }
    }
  }

  // SKUs en la tabla que NO tienen carpeta/foto
  const skusSinFoto = [...dbSkus].filter((s) => !folderSkus.has(s));

  // ---- RESUMEN ----
  console.log("\n" + "=".repeat(58));
  console.log("  RESUMEN" + (GO ? "" : " (simulado — nada se escribio)"));
  console.log("=".repeat(58));
  console.log(`🖼️  Fotos subidas            : ${subidas} / ${totalImagenes}`);
  console.log(`✅ Productos actualizados    : ${actualizados}`);
  console.log(`📦 Fotos sin match en la DB  : ${fotosSinMatch.length}`);
  if (fotosSinMatch.length)
    console.log("     " + fotosSinMatch.join(", "));
  console.log(`🕳️  SKUs en DB sin foto       : ${skusSinFoto.length}`);
  if (skusSinFoto.length) console.log("     " + skusSinFoto.join(", "));
  console.log(`📂 Carpetas sin imagen       : ${sinImagen.length}`);
  if (sinImagen.length) console.log("     " + sinImagen.join(", "));
  if (fallasSubida.length) {
    console.log(`\n❌ Fallas (${fallasSubida.length}):`);
    fallasSubida.forEach((x) => console.log("     " + x));
  }
  console.log("=".repeat(58));
  if (!GO) {
    console.log("\n👉 Esto fue una PRUEBA. Para ejecutar de verdad:\n   node scripts/subir-fotos-amarea.mjs --go\n");
  } else {
    console.log("\n✅ Listo.\n");
  }
}

main().catch((e) => {
  console.error("\n❌ Error inesperado:", e);
  process.exit(1);
});
