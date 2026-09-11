"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// El sitio navega sin recargar (App Router), y el Pixel de Meta solo cuenta un
// PageView al cargar la página completa. Sin esto, pasar de la portada a
// /mayoreo y de ahí a un producto contaría como UNA sola visita: los públicos
// de remarketing ("visitó lotes") saldrían casi vacíos.
//
// GA4 sí detecta estos cambios por su cuenta (medición mejorada), así que aquí
// solo se avisa a Meta para no contar doble en Analytics.
export default function PixelRutas() {
  const pathname = usePathname();
  const primera = useRef(true);

  useEffect(() => {
    // El primer PageView ya lo mandó el script del Pixel al cargar.
    if (primera.current) {
      primera.current = false;
      return;
    }
    const w = window as unknown as { fbq?: (...a: unknown[]) => void };
    if (typeof w.fbq === "function") w.fbq("track", "PageView");
  }, [pathname]);

  return null;
}
