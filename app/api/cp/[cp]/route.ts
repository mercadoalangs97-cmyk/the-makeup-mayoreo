import { NextResponse } from "next/server";
import { createAdminSupabase } from "../../../lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Devuelve estado, municipio y colonias de un código postal mexicano.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ cp: string }> }
) {
  const { cp } = await params;
  const clean = (cp || "").replace(/\D/g, "").slice(0, 5);
  if (clean.length !== 5) {
    return NextResponse.json({ error: "C.P. inválido" }, { status: 400 });
  }

  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("codigos_postales")
    .select("colonia,municipio,estado,ciudad")
    .eq("cp", clean);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ found: false });
  }

  const colonias = [...new Set(data.map((r) => r.colonia).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, "es")
  );
  return NextResponse.json({
    found: true,
    estado: data[0].estado || "",
    municipio: data[0].municipio || "",
    ciudad: data[0].ciudad || data[0].municipio || "",
    colonias,
  });
}
