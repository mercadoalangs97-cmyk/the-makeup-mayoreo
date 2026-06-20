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
                <Link href="/mayoreo">Lotes de mayoreo</Link>
              </li>
              <li>
                <Link href="/amarea">AMAREA · Productos</Link>
              </li>
              <li>
                <Link href="/mayoreo#como-funciona">Cómo funciona</Link>
              </li>
              <li>
                <Link href="/mayoreo#opiniones">Opiniones</Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="footer-links-title">Ayuda</div>
            <ul className="footer-links">
              <li>
                <a
                  href="https://wa.me/5215543813568"
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
              </li>
              <li>
                <a href="#">Politica de devoluciones</a>
              </li>
              <li>
                <a href="#">Terminos y condiciones</a>
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
          <span>© 2025 The Makeup Mayoreo CDMX</span>
          <span>🔒 Pagos seguros · Marcas 100% originales</span>
        </div>
      </div>
    </footer>
  );
}
