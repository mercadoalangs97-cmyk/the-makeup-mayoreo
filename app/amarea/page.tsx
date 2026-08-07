import type { Metadata } from "next";
import { fetchProductosTienda, ordenarCategorias } from "../lib/productos";
import { SITE_URL } from "../lib/site";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import AmareaClient from "./AmareaClient";

export const metadata: Metadata = {
  title: "Maquillaje original por pieza · Catálogo AMARÉA",
  description:
    "Catálogo completo de maquillaje original por pieza: e.l.f, NYX, Maybelline, L'Oréal y más. Filtra por categoría, marca y precio. Envío a todo México.",
  alternates: { canonical: `${SITE_URL}/amarea` },
};

// Igual que la portada: se guarda hecha y se refresca cada 60 s.
export const revalidate = 60;

export default async function AmareaCatalogo() {
  const { productos, error } = await fetchProductosTienda();

  const categorias = ordenarCategorias([
    ...new Set(productos.map((p) => p.categoria).filter(Boolean) as string[]),
  ]);
  const marcas = [...new Set(productos.map((p) => p.marcaNorm))].sort((a, b) =>
    a.localeCompare(b)
  );

  return (
    <>
      <SiteHeader variant="amarea" />
      <AmareaClient
        productos={productos}
        categorias={categorias}
        marcas={marcas}
        error={error}
        modo="catalogo"
      />
      <SiteFooter />
    </>
  );
}
