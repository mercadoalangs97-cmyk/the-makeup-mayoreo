-- =====================================================================
-- INVENTARIO "DE RAÍZ" (19-nov-2026)
-- El stock deja de escribirse como un número fijo desde la memoria de cada
-- computadora. Desde ahora:
--   * El panel SOLO inserta movimientos (entrada / salida / ajuste a un
--     conteo). La base suma o resta el stock en el mismo paso.
--   * Cada movimiento del panel lleva client_id (uuid) único: si se manda dos
--     veces (reintento, dos guardados, dos pestañas) entra UNA vez.
--   * Un UPDATE de productos hecho desde el panel ya no puede cambiar stock
--     ni costo (una copia vieja ya no pisa la venta de la otra compu).
--   * Renombrar o unir SKUs es una sola operación en la base, y un SKU
--     renombrado no puede "resucitar".
-- La venta web (procesar_pago_web) NO cambia: sigue descontando ella misma.
-- Sus movimientos no traen client_id y por eso este libro no los vuelve a
-- aplicar.
-- Se puede correr dos veces sin romper nada.
-- =====================================================================

-- 1) Columnas nuevas en movimientos
alter table movimientos add column if not exists client_id uuid;
alter table movimientos add column if not exists stock_final integer;   -- ajuste: "deja el stock en N"
alter table movimientos add column if not exists razon text;
create unique index if not exists movimientos_client_id_uq on movimientos(client_id);

-- 2) SKUs renombrados o unidos (para que una pestaña vieja no los reviva)
create table if not exists sku_renombrados (
  viejo text primary key,
  nuevo text not null,
  fecha timestamptz not null default now()
);
alter table sku_renombrados enable row level security;
drop policy if exists sku_renombrados_leer on sku_renombrados;
create policy sku_renombrados_leer on sku_renombrados for select to authenticated using (true);

-- 3) Antes de insertar un movimiento del panel: resolver SKU renombrado,
--    bloquear la fila del producto, convertir "ajuste a N" en entrada/salida
--    y calcular el costo promedio. NO cambia productos todavía: eso pasa
--    DESPUÉS de insertar, para que un client_id repetido no aplique dos veces.
create or replace function mk_mov_antes() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_stock int; v_costo numeric; v_delta int; v_nuevo text;
begin
  if new.client_id is null then return new; end if;          -- web / versión vieja: no toca stock

  select nuevo into v_nuevo from sku_renombrados where viejo = new.sku;
  if v_nuevo is not null then new.sku := v_nuevo; end if;

  select coalesce(stock,0), coalesce(costo_unitario,0) into v_stock, v_costo
    from productos where sku = new.sku for update;
  if not found then
    raise exception 'MK_SIN_PRODUCTO: %', new.sku using errcode = 'P0002';
  end if;

  if new.stock_final is not null then
    v_delta := new.stock_final - v_stock;
    new.qty := abs(v_delta);
    new.tipo := case when v_delta >= 0 then 'entrada' else 'salida' end;
    new.metodo := coalesce(nullif(new.metodo,''), 'ajuste');
  end if;

  if coalesce(new.qty,0) < 0 then
    raise exception 'MK_QTY_NEGATIVA: %', new.qty using errcode = '22023';
  end if;

  if new.tipo = 'entrada' and new.stock_final is null and coalesce(new.costo,0) > 0 and new.qty > 0 then
    new.costo_promedio := round(
      case when v_stock <= 0 or v_costo <= 0 then new.costo
           else (v_stock * v_costo + new.qty * new.costo) / (v_stock + new.qty) end, 4);
  elsif coalesce(new.costo_promedio,0) = 0 then
    new.costo_promedio := v_costo;
  end if;
  return new;
end $$;

-- 4) Después de insertar: aplicar al stock (y al costo si fue entrada con costo).
create or replace function mk_mov_despues() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.client_id is null then return null; end if;
  perform set_config('mk.libro', '1', true);
  update productos set
    stock = coalesce(stock,0) + case when new.tipo = 'entrada' then new.qty else -new.qty end,
    costo_unitario = case when new.tipo = 'entrada' and new.stock_final is null and coalesce(new.costo,0) > 0
                          then new.costo_promedio else costo_unitario end
  where sku = new.sku;
  perform set_config('mk.libro', '0', true);
  return null;
end $$;

drop trigger if exists mk_mov_antes on movimientos;
create trigger mk_mov_antes before insert on movimientos
  for each row execute function mk_mov_antes();
drop trigger if exists mk_mov_despues on movimientos;
create trigger mk_mov_despues after insert on movimientos
  for each row execute function mk_mov_despues();

-- 5) Guardia de productos: desde el panel (rol authenticated/anon) el stock y
--    el costo solo cambian por el libro. Un producto nuevo nace en 0 y recibe
--    su stock con su movimiento de entrada. Un SKU renombrado no se recrea.
create or replace function mk_prod_guardia() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_setting('mk.libro', true) = '1' then return new; end if;
  if current_user not in ('authenticated','anon') then return new; end if;   -- servidor / funciones
  if tg_op = 'UPDATE' then
    new.stock := old.stock;
    new.costo_unitario := old.costo_unitario;
  else
    if exists (select 1 from sku_renombrados where viejo = new.sku) then
      return null;                                   -- no revivir un SKU renombrado
    end if;
    new.stock := 0;
  end if;
  return new;
end $$;
drop trigger if exists mk_prod_guardia on productos;
create trigger mk_prod_guardia before insert or update on productos
  for each row execute function mk_prod_guardia();

-- 6) Fijar el costo a mano (ficha del producto)
create or replace function mk_fijar_costo(p_sku text, p_costo numeric) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('mk.libro', '1', true);
  update productos set costo_unitario = p_costo where sku = p_sku;
  perform set_config('mk.libro', '0', true);
end $$;

-- 7) Renombrar SKU en un solo paso (copia el stock ACTUAL de la base)
create or replace function mk_renombrar_sku(p_viejo text, p_nuevo text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_viejo = p_nuevo then return; end if;
  if exists (select 1 from productos where sku = p_nuevo) then
    raise exception 'MK_SKU_OCUPADO: %', p_nuevo using errcode = '23505';
  end if;
  if not exists (select 1 from productos where sku = p_viejo) then
    raise exception 'MK_SIN_PRODUCTO: %', p_viejo using errcode = 'P0002';
  end if;
  perform set_config('mk.libro', '1', true);
  insert into productos
    select (jsonb_populate_record(null::productos, to_jsonb(p) || jsonb_build_object('sku', p_nuevo))).*
    from productos p where p.sku = p_viejo;
  update movimientos set sku = p_nuevo where sku = p_viejo;
  delete from productos where sku = p_viejo;
  insert into sku_renombrados(viejo, nuevo) values (p_viejo, p_nuevo)
    on conflict (viejo) do update set nuevo = excluded.nuevo, fecha = now();
  update sku_renombrados set nuevo = p_nuevo where nuevo = p_viejo;   -- cadenas A→B→C
  perform set_config('mk.libro', '0', true);
end $$;

-- 8) Unir un producto duplicado dentro de otro (suma stock, costo ponderado,
--    une códigos de barras, mueve el historial y borra el duplicado)
create or replace function mk_fusionar_skus(p_conservar text, p_borrar text) returns void
language plpgsql security definer set search_path = public as $$
declare a productos; b productos; sa int; sb int;
begin
  if p_conservar = p_borrar then return; end if;
  select * into a from productos where sku = p_conservar for update;
  select * into b from productos where sku = p_borrar for update;
  if a.sku is null or b.sku is null then
    raise exception 'MK_SIN_PRODUCTO: % / %', p_conservar, p_borrar using errcode = 'P0002';
  end if;
  sa := greatest(coalesce(a.stock,0),0); sb := greatest(coalesce(b.stock,0),0);
  perform set_config('mk.libro', '1', true);
  update productos set
    stock = coalesce(a.stock,0) + coalesce(b.stock,0),
    costo_unitario = case when sa + sb > 0 and coalesce(a.costo_unitario,0) > 0 and coalesce(b.costo_unitario,0) > 0
                          then round((sa * a.costo_unitario + sb * b.costo_unitario) / (sa + sb), 4)
                          else coalesce(nullif(a.costo_unitario,0), b.costo_unitario) end,
    barcode = coalesce(nullif(a.barcode,''), b.barcode),
    barcodes = (select array_agg(distinct x) from unnest(
                  coalesce(a.barcodes,'{}') || coalesce(b.barcodes,'{}') ||
                  array_remove(array[b.barcode], null)) x where x is not null and x <> '')
  where sku = p_conservar;
  update movimientos set sku = p_conservar where sku = p_borrar;
  delete from productos where sku = p_borrar;
  insert into sku_renombrados(viejo, nuevo) values (p_borrar, p_conservar)
    on conflict (viejo) do update set nuevo = excluded.nuevo, fecha = now();
  update sku_renombrados set nuevo = p_conservar where nuevo = p_borrar;
  perform set_config('mk.libro', '0', true);
end $$;

revoke execute on function mk_fijar_costo(text, numeric) from anon, public;
revoke execute on function mk_renombrar_sku(text, text) from anon, public;
revoke execute on function mk_fusionar_skus(text, text) from anon, public;
grant execute on function mk_fijar_costo(text, numeric) to authenticated;
grant execute on function mk_renombrar_sku(text, text) to authenticated;
grant execute on function mk_fusionar_skus(text, text) to authenticated;

-- 9) Comprobación: debe regresar 3 filas (los triggers) y 3 funciones.
select tgname from pg_trigger where tgname in ('mk_mov_antes','mk_mov_despues','mk_prod_guardia');
select proname from pg_proc where proname in ('mk_fijar_costo','mk_renombrar_sku','mk_fusionar_skus');
