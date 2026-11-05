-- ============================================================================
--  PRECIO POR CANTIDAD (mayoreo) EN PRODUCTOS SUELTOS
-- ============================================================================
--  Hasta ahora cada producto tenia un solo precio y el mayoreo vivia solo en
--  los lotes. Los accesorios (puffs, cepillos, brochas) se venden por pieza
--  con precio mas bajo a partir de cierta cantidad, asi que el producto
--  necesita cargar esa segunda tarifa.
--
--  El minimo se cuenta POR FAMILIA, no por color: 6 puffs son 6 aunque sean
--  de tres colores distintos.
--
--  Correr en Supabase -> SQL Editor. Es seguro repetirlo.
-- ----------------------------------------------------------------------------

ALTER TABLE productos ADD COLUMN IF NOT EXISTS mayoreo_precio  NUMERIC;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS mayoreo_desde   INTEGER;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS mayoreo_familia TEXT;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS mayoreo_nota    TEXT;

COMMENT ON COLUMN productos.mayoreo_precio  IS 'Precio por pieza al llegar al minimo. Vacio = este producto no tiene mayoreo.';
COMMENT ON COLUMN productos.mayoreo_desde   IS 'Piezas minimas, sumando toda la familia.';
COMMENT ON COLUMN productos.mayoreo_familia IS 'Agrupa los colores del mismo producto, ej. puff-sweetbeauty.';
COMMENT ON COLUMN productos.mayoreo_nota    IS 'Condicion que ve la clienta, ej. se envian surtidos en los tres colores.';

-- Para sumar rapido las piezas de una familia.
CREATE INDEX IF NOT EXISTS productos_mayoreo_familia_idx
  ON productos (mayoreo_familia)
  WHERE mayoreo_familia IS NOT NULL;

-- Comprobacion: debe devolver las cuatro columnas nuevas.
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'productos' AND column_name LIKE 'mayoreo%'
ORDER BY column_name;
