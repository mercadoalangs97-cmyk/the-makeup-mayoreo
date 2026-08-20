-- ============================================================
--  Varios códigos de barras por producto
--  Un producto de maquillaje trae más de un código válido: el de la caja,
--  el del producto suelto, y a veces uno distinto por tanda de producción.
--  Guardando solo uno, el otro FALLA en cada reinventario, para siempre.
--  Correr en Supabase → SQL Editor. Idempotente.
-- ============================================================
alter table public.productos
  add column if not exists barcodes text[] not null default '{}';

-- Búsqueda rápida por cualquiera de los códigos alternos.
create index if not exists productos_barcodes_idx on public.productos using gin (barcodes);
