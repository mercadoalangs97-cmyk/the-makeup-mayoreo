import Link from "next/link";
import { NEGOCIO, NEGOCIO_DIR } from "../lib/site";
import WppLink from "./WppLink";

export default function SiteFooter() {
  return (
    <footer>
      <div className="footer-inner">
        <div className="footer-grid">
          <div>
            <div className="footer-brand serif">The Makeup Mayoreo</div>
            <div className="footer-brand-sub">CDMX</div>
            <p className="footer-desc">
              Las mejores marcas de beauty para revendedoras y consumidoras:
              e.l.f, NYX, Maybelline, L&apos;Oréal, Pixi y más.
            </p>
            <address className="footer-contacto">
              📍 {NEGOCIO_DIR}
              <br />
              📱{" "}
              <WppLink href={`https://wa.me/${NEGOCIO.whatsapp}`} fuente="whatsapp_footer_tel">
                {NEGOCIO.telefono}
              </WppLink>
              <br />
              ✉️ <a href={`mailto:${NEGOCIO.email}`}>{NEGOCIO.email}</a>
            </address>
          </div>
          <div>
            <div className="footer-links-title">Tienda</div>
            <ul className="footer-links">
              <li>
                <Link href="/amarea">Productos</Link>
              </li>
              <li>
                <Link href="/amarea?ver=filtros">Categorías</Link>
              </li>
              <li>
                <Link href="/guias">Guías de maquillaje</Link>
              </li>
              <li>
                <WppLink href="https://wa.me/5215543813568" fuente="whatsapp_footer">
                  WhatsApp
                </WppLink>
              </li>
            </ul>
          </div>
          <div>
            <div className="footer-links-title">Ayuda</div>
            <ul className="footer-links">
              <li>
                <Link href="/nosotros">Quiénes somos</Link>
              </li>
              <li>
                <Link href="/contacto">Contacto</Link>
              </li>
              <li>
                <Link href="/devoluciones">Cambios y devoluciones</Link>
              </li>
              <li>
                <Link href="/terminos">Términos y condiciones</Link>
              </li>
              <li>
                <Link href="/privacidad">Aviso de Privacidad</Link>
              </li>
            </ul>
            <div className="footer-pay">
              <span className="pay-chip">Visa</span>
              <span className="pay-chip">Mastercard</span>
              <span className="pay-chip">Mercado Pago</span>
              <span className="pay-chip">SPEI</span>
              <span className="pay-chip">OXXO</span>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 The Makeup CDMX · Pagos seguros · Marcas 100% originales</span>
          <Link
            href="/mayoreo"
            style={{ color: "inherit", textDecoration: "underline", opacity: 0.85 }}
          >
            ¿Eres revendedora? Ver mayoreo →
          </Link>
        </div>
      </div>
    </footer>
  );
}
