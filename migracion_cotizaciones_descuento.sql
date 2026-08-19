-- ============================================================
--  Descuento por cotización (solo para esa compra)
--  Correr en Supabase → SQL Editor. Idempotente.
-- ============================================================

-- Monto del descuento EN PESOS, ya calculado. Se guarda en pesos y no en
-- porcentaje para que el precio no cambie si mañana se mueve el del lote.
alter table public.cotizaciones add column if not exists descuento numeric not null default 0;

-- Solo para mostrarlo bonito ("10% de descuento"); el que manda es el monto.
alter table public.cotizaciones add column if not exists descuento_pct numeric;

-- Por qué se dio (uso interno, no se le muestra a la clienta).
alter table public.cotizaciones add column if not exists descuento_motivo text;
