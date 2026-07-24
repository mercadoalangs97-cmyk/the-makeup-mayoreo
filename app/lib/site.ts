// URL base del sitio en producción (para sitemap, robots y schema.org).
// Configúrala en Vercel como NEXT_PUBLIC_SITE_URL cuando tengas tu dominio
// (ej. https://themakeupmayoreo.com). Mientras tanto usa un placeholder.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.themakeup.com.mx"
).replace(/\/$/, "");

export const SITE_NAME = "The Makeup Mayoreo CDMX";

// Datos del negocio (usar SIEMPRE estos para que coincidan en todo el sitio y en
// Merchant Center — la consistencia es clave contra "Misrepresentation").
export const NEGOCIO = {
  nombre: "The Makeup · AMAREA",
  calle: "Bosque de Checoslovaquia 78",
  colonia: "Bosques de Aragón",
  cp: "57170",
  ciudad: "Nezahualcóyotl",
  estado: "Estado de México",
  pais: "México",
  telefono: "+52 55 4381 3568",
  whatsapp: "5215543813568",
  email: "ventas@themakeup.com.mx",
};
export const NEGOCIO_DIR = `${NEGOCIO.calle}, ${NEGOCIO.colonia}, C.P. ${NEGOCIO.cp}, ${NEGOCIO.ciudad}, ${NEGOCIO.estado}, ${NEGOCIO.pais}`;
