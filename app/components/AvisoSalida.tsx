"use client";

import { useEffect, useState } from "react";
import { DIAS_ENVIO, proximaSalida } from "../lib/diasEnvio";

/** La fecha se calcula ya en el navegador: una página guardada en caché no debe mostrar un día viejo. */
export default function AvisoSalida() {
  const [salida, setSalida] = useState<string | null>(null);
  useEffect(() => setSalida(proximaSalida().etiqueta), []);
  return (
    <p style={{ fontSize: 13.5, lineHeight: 1.45, margin: "10px 0" }}>
      📅 Hacemos envíos <strong>{DIAS_ENVIO}</strong>.
      {salida ? (
        <>
          {" "}
          Si tu pago se acredita ahora, tu pedido sale <strong>{salida}</strong>.
        </>
      ) : null}
    </p>
  );
}
