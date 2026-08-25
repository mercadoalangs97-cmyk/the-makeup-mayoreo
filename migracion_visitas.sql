-- ============================================================
--  Visitas: de dónde llega la gente al sitio.
--  Una fila por sesión (no por página). Sin datos personales:
--  solo el origen, para poder responder "¿esto es SEO o pauta?"
--  sin depender de la pantalla de Google Analytics.
--  Correr en Supabase → SQL Editor. Idempotente.
-- ============================================================
create table if not exists public.visitas (
  id        bigserial primary key,
  creado_en timestamptz not null default now(),
  fuente    text not null,          -- google-ads | google-organico | bing-organico | redes | whatsapp | directo | referido
  ref_host  text,                   -- de qué sitio venía (vacío si escribió la dirección)
  landing   text,                   -- primera página que vio
  gclid     boolean not null default false  -- true = clic pagado de Google Ads
);

create index if not exists visitas_creado_idx on public.visitas (creado_en desc);

alter table public.visitas enable row level security;
grant all on public.visitas to service_role;

-- El panel las lee; nadie más. La escritura la hace el servidor.
drop policy if exists visitas_lectura on public.visitas;
create policy visitas_lectura on public.visitas
  for select to authenticated using (true);
grant select on public.visitas to authenticated;
