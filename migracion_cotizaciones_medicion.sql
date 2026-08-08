-- ============================================================
--  Medir el embudo de las cotizaciones
--  Hasta ahora solo sabíamos si se pagaban. Si no se pagan, no había forma
--  de saber si siquiera abrieron el link. Correr en Supabase → SQL Editor.
-- ============================================================

-- Cuántas veces se abrió el link (lo marca el navegador de la clienta, no la
-- vista previa de WhatsApp, que no ejecuta JavaScript).
alter table public.cotizaciones add column if not exists vistas integer not null default 0;

-- Cuándo le dio al botón de pagar (antes esto se guardaba en vista_en, que
-- por nombre parecía "la abrió" y no lo era).
alter table public.cotizaciones add column if not exists pago_click_en bigint;
