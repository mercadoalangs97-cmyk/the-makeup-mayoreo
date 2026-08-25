// Sube las portadas de las guías al bucket con el nombre que espera el sitio
// (sitio/guia-<slug>.png) y genera sus variantes ligeras opt/ para no gastar
// egress sirviendo el PNG original en cada visita.
//
//   node scripts/subir-portadas-guias.mjs
//
// Es idempotente: volver a correrlo reemplaza los archivos.

import fs from "node:fs";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const sb = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);
const BUCKET = "product-photos";
const ANCHOS = [420, 800, 1200]; // los mismos que usa app/lib/img.ts

const PORTADAS = {
  "como-elegir-base-de-maquillaje":
    "https://cdn.openart.ai/openart-ai/production/2026-08/create-image/guvHeReJRzS10Zcsp8uM/image_1787636540751_c46176aa_1787636540825_0667c285.png",
  "maquillaje-original-como-saber-si-es-autentico":
    "https://cdn.openart.ai/openart-ai/production/2026-08/create-image/guvHeReJRzS10Zcsp8uM/image_1787636549955_9c77903a_1787636550246_ed5535f1.png",
  "labiales-mate-satinado-o-gloss":
    "https://cdn.openart.ai/openart-ai/production/2026-08/create-image/guvHeReJRzS10Zcsp8uM/image_1787636559444_6b241568_1787636559551_59a9f521.png",
  "maquillaje-centro-cdmx-vs-original-importado":
    "https://cdn.openart.ai/openart-ai/production/2026-08/create-image/guvHeReJRzS10Zcsp8uM/image_1787636549320_32314834_1787636549380_d98296a8.png",
  "cuanto-cuesta-enviar-un-lote-de-maquillaje":
    "https://cdn.openart.ai/openart-ai/production/2026-08/create-image/guvHeReJRzS10Zcsp8uM/image_1787636160529_299005ce_1787636160637_c5724874.png",
  "cuanto-cuesta-empezar-a-vender-maquillaje":
    "https://cdn.openart.ai/openart-ai/production/2026-08/create-image/guvHeReJRzS10Zcsp8uM/image_1787636178239_dc9b4549_1787636178300_15a27046.png",
  "como-vender-maquillaje-al-mayoreo":
    "https://cdn.openart.ai/openart-ai/production/2026-08/create-image/guvHeReJRzS10Zcsp8uM/image_1787636557515_3985ce07_1787636557560_af632af9.png",
  "que-lote-de-maquillaje-comprar":
    "https://cdn.openart.ai/openart-ai/production/2026-08/create-image/guvHeReJRzS10Zcsp8uM/image_1787636570998_e85cad68_1787636571070_17165672.png",
  "donde-vender-maquillaje-si-eres-revendedora":
    "https://cdn.openart.ai/openart-ai/production/2026-08/create-image/guvHeReJRzS10Zcsp8uM/image_1787636579192_809fc11c_1787636579247_93eec8cd.png",
  "como-poner-precio-al-maquillaje-que-revendes":
    "https://cdn.openart.ai/openart-ai/production/2026-08/create-image/guvHeReJRzS10Zcsp8uM/image_1787636587319_a904b49d_1787636587510_acf36b0c.png",
};

async function subir(ruta, buf, tipo) {
  const { error } = await sb.storage
    .from(BUCKET)
    .upload(ruta, buf, { contentType: tipo, upsert: true });
  if (error) throw new Error(ruta + ": " + error.message);
}

let ok = 0;
for (const [slug, url] of Object.entries(PORTADAS)) {
  const nombre = "guia-" + slug;
  process.stdout.write("  " + nombre.padEnd(52));
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("descarga HTTP " + res.status);
    const original = Buffer.from(await res.arrayBuffer());

    // El original queda como PNG (es la ruta que arma guiaImg()).
    await subir("sitio/" + nombre + ".png", original, "image/png");

    // Variantes ligeras: son las que de verdad se sirven al visitante.
    const pesos = [];
    for (const w of ANCHOS) {
      const webp = await sharp(original)
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      await subir("sitio/opt/" + nombre + "-w" + w + ".webp", webp, "image/webp");
      pesos.push(w + ":" + Math.round(webp.length / 1024) + "kB");
    }
    console.log(
      "OK  png " + Math.round(original.length / 1024) + "kB → " + pesos.join(" ")
    );
    ok++;
  } catch (e) {
    console.log("FALLÓ  " + e.message);
  }
}
console.log("\nPortadas subidas: " + ok + " de " + Object.keys(PORTADAS).length);
