// Datos que le pasamos a Mercado Pago para que su antifraude decida mejor.
// Checkout Pro no deja forzar 3D Secure desde código (se activa con el equipo
// comercial de MP); lo que sí podemos hacer es mandar comprador completo y el
// Device ID del navegador, que es lo que MP pide para analizar el riesgo.

type Datos = Record<string, unknown>;

const txt = (v: unknown) => String(v ?? "").trim();

/** payer de la preferencia: nombre y apellido separados, teléfono con lada, dirección. */
export function payerMP(env: Datos) {
  const completo = txt(env.nombre).replace(/\s+/g, " ");
  const [nombre, ...resto] = completo.split(" ");
  const tel = txt(env.telefono).replace(/\D/g, "").slice(-10);
  const email = txt(env.email);
  const cp = txt(env.cp).replace(/\D/g, "");
  const calle = txt(env.calle);
  const numero = txt(env.numero);
  return {
    name: nombre || "",
    ...(resto.length ? { surname: resto.join(" ") } : {}),
    ...(email ? { email } : {}),
    ...(tel.length === 10
      ? { phone: { area_code: tel.slice(0, 2), number: tel.slice(2) } }
      : {}),
    ...(calle || cp
      ? {
          address: {
            ...(cp ? { zip_code: cp } : {}),
            ...(calle ? { street_name: calle } : {}),
            ...(numero ? { street_number: numero } : {}),
          },
        }
      : {}),
  };
}

/** Device ID que manda el navegador (security.js de MP). Solo acepta algo con forma razonable. */
export function deviceIdMP(v: unknown): string | undefined {
  const s = txt(v);
  return /^[A-Za-z0-9_\-:.]{8,600}$/.test(s) ? s : undefined;
}
