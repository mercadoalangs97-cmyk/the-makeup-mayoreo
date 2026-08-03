-- ============================================================
--  OPINIONES: reseñas reales dejadas por las clientas en el sitio
--  Se piden por WhatsApp/correo con el link /opinar
--  Correr en Supabase → SQL Editor. Idempotente.
-- ============================================================
create table if not exists public.opiniones (
  id          uuid primary key default gen_random_uuid(),
  orden_id    text,                      -- pedido corto (8 caracteres) si viene del link
  nombre      text not null,
  ciudad      text,
  calificacion smallint not null,        -- 1 a 5 estrellas
  texto       text not null,
  autoriza    boolean not null default false,  -- permiso para publicarla
  publicada   boolean not null default false,  -- la marca la dueña
  creada_en   bigint not null
);

create index if not exists opiniones_creada_idx on public.opiniones (creada_en desc);

-- Solo el servidor escribe/lee (el formulario pasa por /api/opinar).
alter table public.opiniones enable row level security;
grant all on public.opiniones to service_role;

-- El panel de inventario lee con la sesión del personal.
drop policy if exists opiniones_lee_personal on public.opiniones;
create policy opiniones_lee_personal on public.opiniones
  for select to authenticated using (true);
drop policy if exists opiniones_edita_personal on public.opiniones;
create policy opiniones_edita_personal on public.opiniones
  for update to authenticated using (true) with check (true);
grant select, update on public.opiniones to authenticated;
