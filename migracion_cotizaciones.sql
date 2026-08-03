-- ============================================================
--  COTIZADOR: cotizaciones armadas desde la app de inventario
--  El link se manda por WhatsApp y la clienta solo paga.
--  Correr en Supabase → SQL Editor. Idempotente.
-- ============================================================
create table if not exists public.cotizaciones (
  id                text primary key,          -- código corto, ej. "K7M2QX"
  lote_id           text not null,
  qty               integer not null default 1,
  cliente_nombre    text,
  envio             jsonb,                     -- datos de entrega ya capturados
  envio_costo       numeric not null default 0,
  envio_paqueteria  text,
  envio_servicio    text,
  envio_servicio_code text,
  envio_dias        integer,
  subtotal          numeric not null default 0,
  total             numeric not null default 0,
  creada_en         bigint,
  creada_por        text,
  vista_en          bigint,
  pagada            boolean not null default false,
  orden_id          uuid
);

-- Solo el servidor toca esta tabla (nunca el navegador con anon).
alter table public.cotizaciones enable row level security;
grant all on public.cotizaciones to service_role;
