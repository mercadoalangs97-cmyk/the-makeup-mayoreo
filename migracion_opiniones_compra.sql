-- Qué le vendiste (para ventas hechas fuera del panel: WhatsApp, mano a mano…)
alter table public.opiniones add column if not exists compra text;
