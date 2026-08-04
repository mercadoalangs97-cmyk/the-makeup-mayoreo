import type { Metadata } from "next";
import { fetchProductosTienda, ordenarCategorias } from "./lib/productos";
import { SITE_URL } from "./lib/site";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";
import HomeSeo from "./components/HomeSeo";
import AmareaClient from "./amarea/AmareaClient";

export const metadata: Metadata = {
  title: "The Makeup CDMX · Maquillaje por pieza — e.l.f, NYX, Maybelline",
  description:
    "Compra tus marcas de beauty favoritas por pieza: e.l.f, NYX, Maybelline, L'Oréal y más. Envío a todo México, pago seguro.",
  alternates: { canonical: SITE_URL },
};

// La portada se guarda hecha y se refresca cada 60 s: el servidor contesta al
// instante en vez de consultar el inventario en cada visita. El stock puede
// verse hasta 1 min viejo, pero /api/checkout revalida existencias antes de
// cobrar, así que nunca se vende algo que ya no hay.
export const revalidate = 60;

export default async function Home() {
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
        modo="home"
      />
      <HomeSeo />
      <SiteFooter />
    </>
  );
}
