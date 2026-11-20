// Datos para recibir transferencias SPEI.
//
// (Historia) Segunda vía de pago junto a Mercado Pago, hoy la única: de 26 intentos de pago solo 9 se
// completaron, y NINGUNO fue rechazado por el banco — la gente simplemente no
// terminaba en la pantalla del checkout. La transferencia se hace desde la app
// del banco, fuera del navegador, así que ese problema no la toca. Además no
// cobra comisión (Mercado Pago se lleva ~4.5%).
//
// Estos datos son públicos por naturaleza: sirven para RECIBIR dinero, nunca
// para sacarlo. Por eso viven aquí y no en variables de entorno.
export const DATOS_BANCARIOS = {
  banco: "Nu México",
  clabe: "638180010113705820",
  titular: "María de los Ángeles Sánchez González",
  // El titular no coincide con el nombre del negocio, y eso frena a quien va a
  // transferir. Se dice de frente en la página en vez de dejar la duda.
  notaTitular: "Es la cuenta a nombre de la titular del negocio.",
  // Depósito en efectivo SIN tarjeta en OXXO, 7-Eleven, Soriana, Chedraui,
  // Farmacias del Ahorro y Kiosko (el mismo código que el equipo manda por
  // WhatsApp). Desde el 20-nov-2026 no hay pasarela: solo esto y la CLABE.
  codigoDeposito: "5195374913648205",
  tiendasDeposito: "OXXO, 7-Eleven, Soriana, Chedraui, Farmacias del Ahorro o Kiosko",
} as const;

/** Código de depósito en bloques de 4. */
export function codigoDepositoLegible(c: string = DATOS_BANCARIOS.codigoDeposito): string {
  return c.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

/** CLABE en bloques de 4 para que se pueda leer y copiar sin equivocarse. */
export function clabeLegible(clabe = DATOS_BANCARIOS.clabe): string {
  return clabe.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}
