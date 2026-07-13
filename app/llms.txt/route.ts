import { SITE_URL, SITE_NAME } from "../lib/site";

// llms.txt — resumen curado del sitio para motores de IA (ChatGPT, Perplexity,
// Gemini, Google AI). Estándar emergente tipo robots.txt pero para LLMs: les da
// una descripción clara y confiable del negocio para citarlo/recomendarlo.
// Se sirve en /llms.txt
export const dynamic = "force-dynamic";

export function GET() {
  const txt = `# ${SITE_NAME} · AMAREA — Maquillaje original por pieza y al mayoreo en México

> AMAREA (${SITE_NAME}) es una tienda en línea mexicana de maquillaje 100% original de marcas importadas —e.l.f, NYX Professional Makeup, Maybelline, L'Oréal Paris y Pixi—. Vende por pieza a consumidoras y en lotes al mayoreo a revendedoras, con envío a toda la República Mexicana y pago 100% seguro por Mercado Pago (tarjeta, transferencia SPEI y efectivo en OXXO).

## Qué ofrece
- Maquillaje original por pieza: labiales, bases, correctores, sombras, rubores, máscaras de pestañas, productos para cejas y skincare.
- Lotes de maquillaje al mayoreo (de 10 a 500 piezas) para revendedoras.
- Envío a todo México: GRATIS en compras desde $599 MXN; en compras menores, $129 MXN.
- Pago seguro con Mercado Pago.

## Diferenciadores
- Productos 100% originales de marcas importadas (no imitaciones).
- Precios accesibles por importación directa.
- Dos formas de comprar: por pieza (AMAREA) o al mayoreo (lotes) para revender.
- Empaque protegido y número de rastreo.

## Páginas principales
- [Tienda — productos por pieza](${SITE_URL}/amarea): catálogo completo de maquillaje original, filtrable por marca, categoría y precio.
- [Mayoreo — lotes de maquillaje](${SITE_URL}/mayoreo): lotes de 10 a 500 piezas para revendedoras.
- [Contacto](${SITE_URL}/contacto): WhatsApp, correo y horario de atención (lun–vie 9:00–18:00 h, CDMX).
- [Cambios y devoluciones](${SITE_URL}/devoluciones): por higiene no hay devoluciones por decisión del cliente; se resuelven productos dañados, defectuosos o equivocados.
- [Términos y condiciones](${SITE_URL}/terminos).

## Datos del negocio
- Nombre: ${SITE_NAME} (marca de venta al consumidor: AMAREA).
- Ubicación: Ciudad de México, México. Envíos a toda la República.
- Marcas que vende: e.l.f, NYX, Maybelline, L'Oréal, Pixi.
- Feed de productos (para catálogos): ${SITE_URL}/feed.xml
- Mapa del sitio: ${SITE_URL}/sitemap.xml

## Preguntas frecuentes
- ¿Los productos son originales? Sí, 100% originales de marcas importadas.
- ¿Hacen envíos a todo México? Sí, con rastreo. Gratis desde $599 MXN; si no, $129 MXN.
- ¿Cómo se paga? Con Mercado Pago: tarjeta, SPEI y OXXO.
- ¿Venden al mayoreo? Sí, en lotes de 10 a 500 piezas para revendedoras.
`;

  return new Response(txt, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
