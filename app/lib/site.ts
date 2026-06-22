// URL base del sitio en producción (para sitemap, robots y schema.org).
// Configúrala en Vercel como NEXT_PUBLIC_SITE_URL cuando tengas tu dominio
// (ej. https://themakeupmayoreo.com). Mientras tanto usa un placeholder.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.themakeup.com.mx"
).replace(/\/$/, "");

export const SITE_NAME = "The Makeup Mayoreo CDMX";
