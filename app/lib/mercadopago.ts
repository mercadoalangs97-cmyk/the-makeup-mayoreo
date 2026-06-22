import { MercadoPagoConfig } from "mercadopago";

// Cliente de Mercado Pago — SOLO server-side (usa el access token secreto).
export function mpClient(): MercadoPagoConfig {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) throw new Error("Falta MERCADOPAGO_ACCESS_TOKEN");
  return new MercadoPagoConfig({
    accessToken,
    options: { timeout: 8000 },
  });
}

export function mpConfigurado(): boolean {
  const t = process.env.MERCADOPAGO_ACCESS_TOKEN || "";
  return t.length > 20 && !t.includes("PEGA-AQUI");
}

export function esModoPrueba(): boolean {
  return (process.env.MERCADOPAGO_ACCESS_TOKEN || "").startsWith("TEST-");
}
