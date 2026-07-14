-- ============================================================
--  PUNTO 5 — Suscripción (lista WhatsApp) + Cupón de bienvenida
--  Correr en Supabase → SQL Editor. Es idempotente (se puede correr 2 veces).
-- ============================================================

-- 1) Lista de suscriptores (para promociones por WhatsApp)
create table if not exists public.suscriptores (
  id        uuid primary key default gen_random_uuid(),
  whatsapp  text not null,
  nombre    text,
  fuente    text default 'popup',
  creado_en timestamptz not null default now()
);
create unique index if not exists suscriptores_whatsapp_key on public.suscriptores (whatsapp);

-- 2) Cupones de descuento
create table if not exists public.cupones (
  codigo          text primary key,
  descripcion     text,
  tipo            text    not null default 'porcentaje',  -- por ahora solo 'porcentaje'
  valor           numeric not null,                        -- 10 = 10%
  activo          boolean not null default true,
  solo_productos  boolean not null default true,           -- solo AMAREA (no lotes)
  min_compra      numeric,                                 -- null = sin mínimo
  una_vez_por_wpp boolean not null default true,           -- una sola vez por número
  creado_en       timestamptz not null default now()
);

-- Cupón de bienvenida 10%
insert into public.cupones (codigo, descripcion, valor, solo_productos, una_vez_por_wpp)
values ('BIENVENIDA10',
        '10% de bienvenida en tu primera compra de productos individuales',
        10, true, true)
on conflict (codigo) do nothing;

-- 3) Columnas de cupón en las órdenes
alter table public.ordenes_web add column if not exists cupon     text;
alter table public.ordenes_web add column if not exists descuento numeric not null default 0;

-- 4) Seguridad: estas tablas SOLO se tocan desde el servidor (service_role).
--    RLS activado sin policies para anon => el público NO puede leer la lista.
alter table public.suscriptores enable row level security;
alter table public.cupones      enable row level security;

-- 5) Permisos para el rol del servidor (por si se perdieron los grants).
grant all on public.suscriptores to service_role;
grant all on public.cupones      to service_role;
