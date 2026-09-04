-- ============================================================
--  APARTADO: la clienta paga un anticipo para reservar su lote
--  y completa el resto despues. El MISMO link sirve para las dos
--  cosas: al abrirlo muestra el saldo que falta.
--  Correr en Supabase → SQL Editor. Idempotente.
-- ============================================================

-- Cuanto dejo de anticipo y cuando (null = no ha apartado).
alter table public.cotizaciones
  add column if not exists apartado_monto  numeric,
  add column if not exists apartado_en     bigint,
  add column if not exists apartado_pago_id text;

-- El anticipo NO es una venta: no crea orden ni descuenta inventario.
-- La venta ocurre cuando paga el resto y se salda la cotizacion.
comment on column public.cotizaciones.apartado_monto is
  'Anticipo recibido para reservar el lote. La venta se registra al completar el pago.';
