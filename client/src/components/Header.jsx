import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useCartContext } from "../context/CartContext.jsx";

// ── Header ────────────────────────────────────────────────────────────────────
// Rendered on every page (see App.jsx, where it lives outside <Routes>).
// It reads totalItems from CartContext so the cart badge stays up-to-date
// across all pages without any props being passed in.
//
// Visual redesign: frosted-glass sticky bar, serif wordmark "Drape",
// animated underline nav-links, and a green badge on the cart icon.
// Logic is unchanged — same useCartContext() + Link structure.
export default function Header() {
  const { totalItems } = useCartContext();

  // Add a "scrolled" class once the user scrolls past 10px
  // so we can add a drop shadow via CSS (.site-header.scrolled).
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`site-header${scrolled ? " scrolled" : ""}`}>
      <div className="header-inner">
        {/* Brand / Home link — display serif wordmark */}
        <Link to="/" className="header-brand">
          Drape
          <span className="brand-dot" aria-hidden="true" />
        </Link>

        <nav className="header-nav" aria-label="Primary navigation">
          <Link to="/" className="nav-link">
            Home
          </Link>

          {/* Cart link with a badge showing item count */}
          <Link to="/cart" className="nav-link cart-nav-link" id="cart-nav-btn" aria-label={`Cart, ${totalItems} item${totalItems !== 1 ? "s" : ""}`}>
            {/* Inline SVG shopping-bag icon */}
            <svg className="cart-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            Cart
            {/* Only show the badge when there is at least one item */}
            {totalItems > 0 && (
              <span className="cart-badge" aria-hidden="true">{totalItems}</span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}
