-- ============================================================
--  Poder archivar un carrito abandonado a mano
--  Correr en Supabase → SQL Editor. Idempotente.
-- ============================================================
alter table public.ordenes_web
  add column if not exists carrito_descartado boolean not null default false;
