import Link from "next/link";

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
                <a
                  href="https://wa.me/5215543813568"
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
              </li>
            </ul>
          </div>
          <div>
            <div className="footer-links-title">Ayuda</div>
            <ul className="footer-links">
              <li>
                <Link href="/contacto">Contacto</Link>
              </li>
              <li>
                <Link href="/devoluciones">Cambios y devoluciones</Link>
              </li>
              <li>
                <Link href="/terminos">Términos y condiciones</Link>
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
