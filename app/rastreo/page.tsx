import type { Metadata } from "next";
import { SITE_URL } from "../lib/site";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import RastreoClient from "./RastreoClient";

export const metadata: Metadata = {
  title: "Rastrea tu pedido · The Makeup / AMARÉA",
  description:
    "Rastrea tu pedido de AMARÉA con tu número de pedido y tu correo: consulta si está en preparación, ya salió y cuál es tu número de guía de Estafeta.",
  alternates: { canonical: `${SITE_URL}/rastreo` },
};

export default function Rastreo() {
  return (
    <>
      <SiteHeader variant="landing" />
      <main className="legal-page">
        <h1 className="serif">Rastrea tu pedido</h1>
        <p className="legal-updated">
          Consulta el estado sin tener que escribirnos
        </p>
        <RastreoClient />
      </main>
      <SiteFooter />
    </>
  );
}
