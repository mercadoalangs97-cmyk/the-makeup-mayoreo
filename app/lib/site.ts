// URL base del sitio en producción (para sitemap, robots y schema.org).
// Configúrala en Vercel como NEXT_PUBLIC_SITE_URL cuando tengas tu dominio
// (ej. https://themakeupmayoreo.com). Mientras tanto usa un placeholder.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.themakeup.com.mx"
).replace(/\/$/, "");

export const SITE_NAME = "The Makeup Mayoreo CDMX";

// Datos del negocio (usar SIEMPRE estos para que coincidan en todo el sitio y en
// Merchant Center — la consistencia es clave contra "Misrepresentation").
// La calle y el número NO viven aquí a propósito: esto se imprime en el pie de
// cada página, y el domicilio es una casa. Lo que se publica llega hasta la
// colonia, que ubica al negocio sin dar el domicilio exacto de nadie.
// El remitente real de las guías es ORIGEN, en lib/skydropx.ts.
export const NEGOCIO = {
  nombre: "The Makeup · AMARÉA",
  colonia: "Bosques de Aragón",
  cp: "57170",
  ciudad: "Nezahualcóyotl",
  estado: "Estado de México",
  pais: "México",
  telefono: "+52 56 5814 6140",
  whatsapp: "5215658146140",
  email: "ventas@themakeup.com.mx",
};
export const NEGOCIO_DIR = `${NEGOCIO.colonia}, C.P. ${NEGOCIO.cp}, ${NEGOCIO.ciudad}, ${NEGOCIO.estado}, ${NEGOCIO.pais}`;
