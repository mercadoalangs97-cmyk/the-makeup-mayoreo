-- ============================================================
--  PUNTO 4 — Carritos abandonados: columnas para el correo recordatorio
--  Correr en Supabase → SQL Editor. Idempotente.
-- ============================================================
alter table public.ordenes_web
  add column if not exists recordatorio_enviado boolean not null default false;
alter table public.ordenes_web
  add column if not exists recordatorio_en timestamptz;
