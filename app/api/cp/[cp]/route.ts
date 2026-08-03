import { NextResponse } from "next/server";
import { createAdminSupabase } from "../../../lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Catálogo público de códigos postales: lo consulta el checkout de la web y
// también la app de inventario (otro dominio) → CORS abierto. Es sólo lectura
// de datos públicos de SEPOMEX, no hay nada sensible que exponer.
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// Devuelve estado, municipio y colonias de un código postal mexicano.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ cp: string }> }
) {
  const { cp } = await params;
  const clean = (cp || "").replace(/\D/g, "").slice(0, 5);
  if (clean.length !== 5) {
    return NextResponse.json(
      { error: "C.P. inválido" },
      { status: 400, headers: CORS }
    );
  }

  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("codigos_postales")
    .select("colonia,municipio,estado,ciudad")
    .eq("cp", clean);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: CORS }
    );
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ found: false }, { headers: CORS });
  }

  const colonias = [...new Set(data.map((r) => r.colonia).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, "es")
  );
  return NextResponse.json(
    {
      found: true,
      estado: data[0].estado || "",
      municipio: data[0].municipio || "",
      ciudad: data[0].ciudad || data[0].municipio || "",
      colonias,
    },
    { headers: CORS }
  );
}
