"use client";

import { gaLead } from "../lib/analytics";

// Enlace a WhatsApp que SÍ registra el contacto como lead en GA4 / Google Ads.
// Sirve dentro de páginas server (footer, contacto…) porque él es el cliente.
export default function WppLink({
  href,
  fuente,
  className,
  children,
}: {
  href: string;
  fuente: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={className}
      target="_blank"
      rel="noreferrer"
      onClick={() => gaLead(fuente)}
    >
      {children}
    </a>
  );
}
