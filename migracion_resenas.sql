-- ============================================================
--  Solicitud de opinión a los 7 días + página de rastreo
--  Correr en Supabase → SQL Editor. Idempotente.
-- ============================================================
alter table public.ordenes_web
  add column if not exists resena_enviada boolean not null default false;
alter table public.ordenes_web
  add column if not exists resena_enviada_en timestamptz;
