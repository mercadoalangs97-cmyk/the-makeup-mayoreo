import type { Metadata } from "next";
import { fetchProductosTienda, ordenarCategorias } from "../lib/productos";
import { SITE_URL } from "../lib/site";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import AmareaClient from "./AmareaClient";

export const metadata: Metadata = {
  title: "Todos los productos · AMARÉA — Maquillaje por pieza | The Makeup CDMX",
  description:
    "Catálogo completo de maquillaje original por pieza: e.l.f, NYX, Maybelline, L'Oréal y más. Filtra por categoría, marca y precio. Envío a todo México.",
  alternates: { canonical: `${SITE_URL}/amarea` },
};

// El stock cambia, así que no cacheamos la página.
export const dynamic = "force-dynamic";

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
