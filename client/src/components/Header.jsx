import { Link } from "react-router-dom";
import { useCartContext } from "../context/CartContext.jsx";

// ── Header ────────────────────────────────────────────────────────────────────
// Rendered on every page (see App.jsx, where it lives outside <Routes>).
// It reads totalItems from CartContext so the cart badge stays up-to-date
// across all pages without any props being passed in.
export default function Header() {
  const { totalItems } = useCartContext();

  return (
    <header className="site-header">
      <div className="header-inner">
        {/* Brand / Home link */}
        <Link to="/" className="header-brand">
          👗 Virtual Try-On
        </Link>

        <nav className="header-nav">
          <Link to="/" className="nav-link">
            Home
          </Link>

          {/* Cart link with a badge showing item count */}
          <Link to="/cart" className="nav-link cart-nav-link" id="cart-nav-btn">
            🛒 Cart
            {/* Only show the badge when there is at least one item */}
            {totalItems > 0 && (
              <span className="cart-badge">{totalItems}</span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}
