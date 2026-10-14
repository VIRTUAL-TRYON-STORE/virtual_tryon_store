import { Link } from "react-router-dom";

// ── Footer ────────────────────────────────────────────────────────────────────
// Simple, minimal site footer. Displayed on every page via App.jsx.
// No logic — purely presentational.
export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer" role="contentinfo">
      <div className="footer-inner">
        {/* Wordmark */}
        <span className="footer-wordmark">Drape</span>

        <p className="footer-tagline">
          A curated virtual try-on experience. Try before you buy.
        </p>

        <nav className="footer-links" aria-label="Footer navigation">
          <Link to="/" className="footer-link">Collection</Link>
          <Link to="/cart" className="footer-link">Cart</Link>
        </nav>

        <p className="footer-copy">
          &copy; {year} Drape &mdash; Virtual Try-On Boutique. Demo project.
        </p>
      </div>
    </footer>
  );
}
