import type { Metadata } from "next";
import { fetchProductosTienda, ordenarCategorias } from "../lib/productos";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import ShopClient from "./ShopClient";

export const metadata: Metadata = {
  title: "AMAREA · Maquillaje por pieza | The Makeup Mayoreo CDMX",
  description:
    "Compra tus marcas de beauty favoritas por pieza: e.l.f, NYX, Maybelline, L'Oréal y más. Envío a todo México.",
};

// El stock cambia, así que no cacheamos la página.
export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const { productos, error } = await fetchProductosTienda();

  const categorias = ordenarCategorias([
    ...new Set(productos.map((p) => p.categoria).filter(Boolean) as string[]),
  ]);
  const marcas = [...new Set(productos.map((p) => p.marcaNorm))].sort((a, b) =>
    a.localeCompare(b)
  );

  return (
    <>
      <SiteHeader />
      <ShopClient
        productos={productos}
        categorias={categorias}
        marcas={marcas}
        error={error}
      />
      <SiteFooter />
    </>
  );
}
