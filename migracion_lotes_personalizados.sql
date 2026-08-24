-- ============================================================
--  Lotes personalizados: armados a la medida desde el cotizador
--  ("lote de 20 piezas solo NYX") — para cobrarlos ya, guardarlos
--  como plantilla y, si se piden mucho, publicarlos en /mayoreo.
--  Correr en Supabase → SQL Editor. Idempotente.
-- ============================================================
create table if not exists public.lotes_personalizados (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  piezas      integer not null default 0,
  precio      numeric not null default 0,  -- total, ya con comisión MP si se sumó
  descripcion text,
  foto        text,
  publicado   boolean not null default false, -- true => aparece en /mayoreo
  veces_usado integer not null default 0,
  creado_en   bigint
);

alter table public.lotes_personalizados enable row level security;
grant all on public.lotes_personalizados to service_role;

drop policy if exists lotes_pers_personal on public.lotes_personalizados;
create policy lotes_pers_personal on public.lotes_personalizados
  for all to authenticated using (true) with check (true);
grant select, insert, update, delete on public.lotes_personalizados to authenticated;

-- Una cotización puede ser SOLO personalizada (sin lote del catálogo)
alter table public.cotizaciones alter column lote_id drop not null;
