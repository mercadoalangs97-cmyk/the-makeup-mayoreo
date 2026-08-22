-- ============================================================
--  Cotizaciones con lote Y productos sueltos en el mismo link
--  Correr en Supabase → SQL Editor. Idempotente.
-- ============================================================
-- Lista de lo que lleva la cotización: [{tipo,ref,qty}]
-- Si está vacío, se usa lote_id/qty como antes (las cotizaciones viejas
-- siguen funcionando sin tocarlas).
alter table public.cotizaciones add column if not exists items jsonb;
