-- ============================================================
--  Panel de suscriptores en la app de inventario
--  (la lista existía pero no se podía ver desde ningún lado)
--  Correr en Supabase → SQL Editor. Idempotente.
-- ============================================================

-- Para saber a quién ya le escribiste y no repetir
alter table public.suscriptores add column if not exists contactado boolean not null default false;
alter table public.suscriptores add column if not exists contactado_en timestamptz;

-- El personal con sesión puede ver y marcar la lista (el público NO).
drop policy if exists suscriptores_lee_personal on public.suscriptores;
create policy suscriptores_lee_personal on public.suscriptores
  for select to authenticated using (true);

drop policy if exists suscriptores_edita_personal on public.suscriptores;
create policy suscriptores_edita_personal on public.suscriptores
  for update to authenticated using (true) with check (true);

grant select, update on public.suscriptores to authenticated;
