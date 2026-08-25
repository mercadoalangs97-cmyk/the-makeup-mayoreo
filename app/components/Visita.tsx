"use client";

import { useEffect } from "react";

// Registra UNA vez por sesión de dónde llegó la persona. Se dispara después
// de que la página ya pintó, para no tocar la velocidad (LCP).
export default function Visita() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem("amarea_visita")) return;
      sessionStorage.setItem("amarea_visita", "1");
    } catch {
      return; // sin sessionStorage no medimos, para no contar de más
    }
    const enviar = () => {
      fetch("/api/visita", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referrer: document.referrer || "",
          landing: location.pathname + location.search,
        }),
        keepalive: true,
      }).catch(() => {});
    };
    const w = window as unknown as { requestIdleCallback?: (cb: () => void) => void };
    if (typeof w.requestIdleCallback === "function") w.requestIdleCallback(enviar);
    else setTimeout(enviar, 1200);
  }, []);
  return null;
}
