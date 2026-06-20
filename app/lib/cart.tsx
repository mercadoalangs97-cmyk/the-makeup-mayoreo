"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { WPP, fmx, ENVIO_GRATIS_DESDE } from "./lotes";

export type CartItem = {
  id: string; // "lote:mixto-50" | "prod:EL-040"
  tipo: "lote" | "producto";
  nombre: string;
  precio: number;
  foto: string | null;
  qty: number;
  max?: number; // tope de stock (solo productos individuales)
  sub?: string; // etiqueta corta (ej "10 piezas" o la marca)
};

type CartCtx = {
  items: CartItem[];
  count: number;
  total: number;
  faltaEnvioGratis: number;
  tieneEnvioGratis: boolean;
  progresoEnvio: number;
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  changeQty: (id: string, delta: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toast: string;
  showToast: (msg: string) => void;
  checkoutWPP: () => void;
  checkoutMP: () => void;
};

const Ctx = createContext<CartCtx | null>(null);
const STORAGE_KEY = "tmk_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cargar de localStorage al montar
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  // Guardar en localStorage cuando cambie
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items, hydrated]);

  // Bloquear scroll del fondo con el carrito abierto
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3000);
  }, []);

  const add = useCallback(
    (item: Omit<CartItem, "qty">, qty = 1) => {
      setItems((prev) => {
        const found = prev.find((it) => it.id === item.id);
        if (found) {
          const max = item.max ?? Infinity;
          const nuevaQty = Math.min(found.qty + qty, max);
          return prev.map((it) =>
            it.id === item.id ? { ...it, ...item, qty: nuevaQty } : it
          );
        }
        const max = item.max ?? Infinity;
        return [...prev, { ...item, qty: Math.min(qty, max) }];
      });
      showToast(item.nombre + " añadido al carrito");
    },
    [showToast]
  );

  const changeQty = useCallback((id: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((it) => {
          if (it.id !== id) return it;
          const max = it.max ?? Infinity;
          return { ...it, qty: Math.max(0, Math.min(it.qty + delta, max)) };
        })
        .filter((it) => it.qty > 0)
    );
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);
  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const count = useMemo(
    () => items.reduce((a, it) => a + it.qty, 0),
    [items]
  );
  const total = useMemo(
    () => items.reduce((a, it) => a + it.precio * it.qty, 0),
    [items]
  );
  const faltaEnvioGratis = Math.max(0, ENVIO_GRATIS_DESDE - total);
  const tieneEnvioGratis = total >= ENVIO_GRATIS_DESDE && total > 0;
  const progresoEnvio = Math.min(100, (total / ENVIO_GRATIS_DESDE) * 100);

  const checkoutWPP = useCallback(() => {
    if (items.length === 0) {
      showToast("Tu carrito está vacío");
      return;
    }
    const lines = items.map(
      (it) =>
        "- " +
        it.nombre +
        " x" +
        it.qty +
        " = " +
        fmx(it.precio * it.qty) +
        " MXN"
    );
    const msg =
      "¡Hola! Quiero hacer el siguiente pedido:\n\n" +
      lines.join("\n") +
      "\n\nTotal: " +
      fmx(total) +
      " MXN\n\n¿Me confirma disponibilidad y datos de pago?";
    window.open(
      "https://wa.me/" + WPP + "?text=" + encodeURIComponent(msg),
      "_blank"
    );
    setIsOpen(false);
  }, [items, total, showToast]);

  const checkoutMP = useCallback(() => {
    showToast("Mercado Pago se integra en la siguiente fase");
  }, [showToast]);

  const value: CartCtx = {
    items,
    count,
    total,
    faltaEnvioGratis,
    tieneEnvioGratis,
    progresoEnvio,
    add,
    changeQty,
    remove,
    clear,
    isOpen,
    openCart,
    closeCart,
    toast,
    showToast,
    checkoutWPP,
    checkoutMP,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart debe usarse dentro de <CartProvider>");
  return ctx;
}
