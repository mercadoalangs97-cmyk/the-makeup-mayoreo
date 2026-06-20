// Preview de agrupación de variantes (tonos) del mismo producto.
// Solo LEE; no escribe nada. Imprime estadísticas y ejemplos.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = {};
for (const line of readFileSync(join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim();
}
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

function normMarca(m) {
  m = (m || "").toLowerCase();
  if (m.includes("e.l.f")) return "elf";
  if (m.includes("l'or") || m.includes("loreal")) return "loreal";
  if (m.includes("maybelline")) return "maybelline";
  if (m.includes("nyx")) return "nyx";
  if (m.includes("pixi")) return "pixi";
  if (m.includes("neutrogena")) return "neutrogena";
  if (m.includes("starface") || m === "sta") return "starface";
  if (m.includes("hero")) return "hero";
  return m;
}
function base(nombre) {
  let s = (nombre || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  s = s
    .replace(/e\.?l\.?f\.?\s*(cosmetics|skin)?/g, " ")
    .replace(/l'?oreal(\s+paris)?/g, " ")
    .replace(/maybelline(\s+new\s+york)?/g, " ")
    .replace(/nyx(\s+professional\s+makeup)?/g, " ")
    .replace(/pixi(\s+by\s+petra)?/g, " ")
    .replace(/neutrogena/g, " ")
    .replace(/starface/g, " ")
    .replace(/hero\s+cosmetics/g, " ");
  return s.replace(/[^a-z0-9]/g, "");
}

const { data: a } = await supabase
  .from("productos")
  .select("sku,nombre,marca,variante,categoria")
  .like("foto", "%product-photos%")
  .gt("stock", 0);

const g = {};
a.forEach((p) => {
  const k = normMarca(p.marca) + "|" + base(p.nombre);
  (g[k] = g[k] || []).push(p);
});
const grupos = Object.values(g);
const multi = grupos.filter((x) => x.length > 1);

console.log("Productos elegibles:", a.length);
console.log(
  "Grupos totales:",
  grupos.length,
  "| con 2+ tonos:",
  multi.length,
  "| productos en grupos multi-tono:",
  multi.reduce((s, x) => s + x.length, 0)
);
console.log("Productos solos (sin selector):", grupos.filter((x) => x.length === 1).length);

const sospechosos = multi.filter(
  (x) => new Set(x.map((p) => p.categoria)).size > 1
);
console.log("Grupos que MEZCLAN categorías (revisar):", sospechosos.length);
sospechosos.forEach((x) =>
  console.log("   ⚠️ " + x.map((p) => p.sku + "/" + p.categoria).join(", "))
);

console.log("\n=== TOP grupos por # de tonos ===");
multi
  .sort((x, y) => y.length - x.length)
  .slice(0, 12)
  .forEach((x) => console.log("  [" + x.length + "] " + x[0].marca + " / " + x[0].nombre));

console.log("\n=== 3 EJEMPLOS detallados ===");
[
  multi.find((x) => x[0].nombre.includes("Glow Reviver Lip Oil Plumping")),
  multi.find((x) => x[0].nombre.includes("Soft Glam Satin Foundation")),
  multi.find((x) => x[0].nombre.includes("Infallible Matte Resistance")),
].forEach((x) => {
  if (!x) return;
  console.log("\n• " + x[0].marca + " — " + x[0].nombre + " (" + x.length + " tonos):");
  x.forEach((p) => console.log("    " + p.sku + "  →  " + (p.variante || "(sin tono)")));
});
