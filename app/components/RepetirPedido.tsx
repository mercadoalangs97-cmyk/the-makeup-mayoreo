"use client";

import { useEffect, useState } from "react";
import { useCart } from "../lib/cart";
import { imgOpt } from "../lib/img";
import { LOTES } from "../lib/lotes";
import { nombreCorto, type Producto } from "../lib/productos";

type Guardado = { items: { id: string; qty: number }[]; fecha: number };

// Botón "Repetir mi último pedido". Sin cuentas de usuario, el pedido anterior
// se guarda en el navegador de la clienta al completar la compra.
// Siempre re-arma el carrito con el PRECIO Y STOCK ACTUALES, nunca los viejos.
export default function RepetirPedido({ productos }: { productos: Producto[] }) {
  const { add, openCart, showToast } = useCart();
  const [guardado, setGuardado] = useState<Guardado | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("amarea_ultimo_pedido");
      if (!raw) return;
      const g = JSON.parse(raw) as Guardado;
      // Solo lo ofrecemos si es de los últimos 120 días.
      if (!g?.items?.length) return;
      if (Date.now() - (g.fecha || 0) > 120 * 24 * 3600 * 1000) return;
      setGuardado(g);
    } catch {}
  }, []);

  if (!guardado) return null;

  function repetir() {
    if (!guardado) return;
    let agregados = 0;
    let sinStock = 0;

    for (const it of guardado.items) {
      if (it.id.startsWith("lote:")) {
        const l = LOTES.find((x) => "lote:" + x.id === it.id);
        if (!l || l.wppOnly) continue;
        add(
          {
            id: "lote:" + l.id,
            tipo: "lote",
            nombre: l.nombre,
            precio: l.precio,
            foto: l.foto,
            sub: l.piezas + " piezas",
          },
          it.qty
        );
        agregados++;
      } else {
        const sku = it.id.replace(/^prod:/, "");
        const p = productos.find((x) => x.sku === sku);
        if (!p || (p.stock || 0) <= 0) {
          sinStock++;
          continue;
        }
        add(
          {
            id: "prod:" + p.sku,
            tipo: "producto",
            nombre: nombreCorto(p),
            precio: p.precio_mxn ?? 0,
            foto: imgOpt(p.foto, 200) ?? p.foto,
            max: p.stock,
            sub: p.marcaNorm,
          },
          Math.min(it.qty, p.stock)
        );
        agregados++;
      }
    }

    if (agregados === 0) {
      showToast("Los productos de tu pedido anterior ya no están disponibles.");
      return;
    }
    if (sinStock > 0) {
      showToast(`Agregamos ${agregados}. ${sinStock} ya no tiene stock.`);
    }
    openCart();
  }

  return (
    <div className="repetir-box">
      <span className="repetir-txt">
        🔁 ¿Vas a pedir lo mismo? Te armamos tu carrito anterior con los precios
        de hoy.
      </span>
      <button className="repetir-btn" onClick={repetir}>
        Repetir mi último pedido
      </button>
    </div>
  );
}
