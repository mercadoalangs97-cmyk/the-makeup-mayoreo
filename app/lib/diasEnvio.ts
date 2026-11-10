// ============================================================================
//  DÍAS DE ENVÍO
// ============================================================================
// Los paquetes salen solo martes, miércoles y jueves (Alan, 9-nov-2026), menos
// los festivos. Un pago acreditado antes de las 12:00 de un día de envío sale
// ese mismo día; el resto sale el siguiente día de envío. La misma regla vive
// en el bot (makeup-bot/src/dias-envio.ts): si cambia, cambiar las dos copias.

export const DIAS_ENVIO = "martes, miércoles y jueves";

const SALE = new Set([2, 3, 4]); // 0 = domingo
const HORA_CORTE = 12;
const SEMANA: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
// Los festivos que caen en lunes (febrero, marzo y noviembre) no afectan: ese día no hay envíos.
const FESTIVOS_FIJOS = new Set(["01-01", "05-01", "09-16", "12-25"]);
const FESTIVOS_UNICOS = new Set(["2030-10-01"]); // Toma de posesión presidencial

const DIA_MS = 86_400_000;

/** Jueves Santo: tres días antes del domingo de Pascua (cálculo gregoriano anónimo). */
function juevesSanto(y: number): string {
  const a = y % 19;
  const b = Math.floor(y / 100);
  const c = y % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const n = h + l - 7 * m + 114;
  const pascua = Date.UTC(y, Math.floor(n / 31) - 1, (n % 31) + 1, 12);
  return new Date(pascua - 3 * DIA_MS).toISOString().slice(0, 10);
}

function hayEnvio(fecha: Date): boolean {
  const iso = fecha.toISOString().slice(0, 10);
  return (
    SALE.has(fecha.getUTCDay()) &&
    !FESTIVOS_FIJOS.has(iso.slice(5)) &&
    !FESTIVOS_UNICOS.has(iso) &&
    iso !== juevesSanto(fecha.getUTCFullYear())
  );
}

export type Salida = {
  /** 0 = hoy, 1 = mañana… */
  enDias: number;
  /** "hoy", "mañana" o "el martes 17 de noviembre". */
  etiqueta: string;
};

/** Cuándo sale un pedido pagado en `ahora`, con el reloj de México. */
export function proximaSalida(ahora: Date = new Date()): Salida {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Mexico_City",
      weekday: "short",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      hourCycle: "h23",
    })
      .formatToParts(ahora)
      .map((x) => [x.type, x.value])
  );
  const fechaEn = (dias: number) => new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day) + dias, 12));
  let enDias = Number(p.hour) < HORA_CORTE ? 0 : 1;
  while (!hayEnvio(fechaEn(enDias))) enDias++;
  if (enDias === 0) return { enDias, etiqueta: "hoy" };
  if (enDias === 1) return { enDias, etiqueta: "mañana" };
  const texto = fechaEn(enDias).toLocaleDateString("es-MX", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
  return { enDias, etiqueta: `el ${texto.replace(",", "")}` };
}
