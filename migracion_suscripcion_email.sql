-- ============================================================
--  PUNTO 5b — Suscribirse con Correo O WhatsApp (el cliente elige)
--  Correr en Supabase → SQL Editor. Idempotente.
-- ============================================================
alter table public.suscriptores add column if not exists email text;
-- Ahora el WhatsApp es opcional (algunos dejarán solo correo)
alter table public.suscriptores alter column whatsapp drop not null;
-- Correo único (permite varios NULL para los que solo dejan WhatsApp)
create unique index if not exists suscriptores_email_key on public.suscriptores (email);
