-- ============================================================
--  Aviso de transferencia: la clienta dice "ya transferí".
--  NO da el pedido por pagado — solo levanta la mano para que
--  revises tu banco y lo confirmes desde el panel.
--  Correr en Supabase → SQL Editor. Idempotente.
-- ============================================================
alter table public.cotizaciones
  add column if not exists transferencia_aviso_en bigint;
