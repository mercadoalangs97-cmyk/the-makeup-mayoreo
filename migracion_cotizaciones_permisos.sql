-- ============================================================
--  FALTABA: permiso para que el PANEL lea las cotizaciones
--  Se le dio acceso solo al servidor (service_role), así que la sección
--  "Cotizaciones enviadas" nunca aparecía en Despacho.
--  Correr en Supabase → SQL Editor. Idempotente.
-- ============================================================
drop policy if exists cotizaciones_lee_personal on public.cotizaciones;
create policy cotizaciones_lee_personal on public.cotizaciones
  for select to authenticated using (true);

drop policy if exists cotizaciones_edita_personal on public.cotizaciones;
create policy cotizaciones_edita_personal on public.cotizaciones
  for update to authenticated using (true) with check (true);

grant select, update on public.cotizaciones to authenticated;
