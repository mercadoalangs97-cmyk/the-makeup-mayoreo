import type { Metadata } from "next";

// Panel interno: fuera de buscadores.
export const metadata: Metadata = { title: "Panel del bot · The Makeup", robots: { index: false, follow: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
