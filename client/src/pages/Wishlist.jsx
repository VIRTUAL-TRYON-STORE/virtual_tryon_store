import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useWishlistContext } from "../context/WishlistContext.jsx";
import { useCartContext } from "../context/CartContext.jsx";
import ProductCard from "../components/ProductCard.jsx";

// ── Wishlist Page ─────────────────────────────────────────────────────────────
// Mounted when the URL is "/wishlist".
//
// Features:
// 1. Loads catalogue products from /api/products and filters for items saved in
//    WishlistContext. If a saved id no longer exists on the server, it is ignored quietly.
// 2. Uses the shared ProductCard component (same as homepage & related products).
// 3. Under each card:
//    - "Add to cart": calls the existing CartContext addToCart() function.
//      The item remains in the wishlist after being added.
//    - "Remove": calls removeFromWishlist() from WishlistContext.
// 4. Loading state with animated skeleton cards while data is being fetched.
// 5. Friendly empty state with an icon and direct link back to collection.
export default function Wishlist() {
  const { wishlist, removeFromWishlist } = useWishlistContext();
  const { addToCart } = useCartContext();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Map to track temporary "Added!" feedback per product id
  const [addedMap, setAddedMap] = useState({});

  useEffect(() => {
    fetch("/api/products")
      .then((res) => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  function handleAddToCart(product) {
    addToCart(product);
    setAddedMap((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedMap((prev) => ({ ...prev, [product.id]: false }));
    }, 1500);
  }

  // Filter server products to only those present in the user's wishlist.
  // Missing server records for legacy/deleted ids are filtered out quietly.
  const savedProducts = products.filter((p) =>
    wishlist.some((id) => String(id) === String(p.id))
  );

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="page">
        <div className="cart-header-row wishlist-header-row">
          <h1>Your Wishlist</h1>
        </div>
        <div className="product-grid" aria-busy="true" aria-label="Loading wishlist items">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton-card" aria-hidden="true">
              <div className="skeleton skeleton-img" />
              <div className="skeleton-body">
                <div className="skeleton skeleton-line medium" />
                <div className="skeleton skeleton-line short" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="page">
        <div className="cart-empty wishlist-empty">
          <span className="cart-empty-icon" aria-hidden="true">⚠️</span>
          <h1>Unable to load your wishlist</h1>
          <p className="cart-empty-sub">{error}</p>
          <Link to="/" className="btn btn-primary">
            Back to collection
          </Link>
        </div>
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (savedProducts.length === 0) {
    return (
      <div className="page">
        <div className="cart-empty wishlist-empty">
          <span className="cart-empty-icon" aria-hidden="true">🤍</span>
          <h1>Your wishlist is empty</h1>
          <p className="cart-empty-sub">
            Save items you love by tapping the heart icon on any product, and
            they will be stored right here for you.
          </p>
          <Link to="/" className="btn btn-primary" id="browse-collection-btn">
            Browse collection
          </Link>
        </div>
      </div>
    );
  }

  // ── Populated wishlist ─────────────────────────────────────────────────────
  return (
    <div className="page">
      <div className="cart-header-row wishlist-header-row">
        <h1>
          Your Wishlist
          <span
            style={{
              fontSize: "var(--text-base)",
              fontFamily: "var(--font-body)",
              fontWeight: 400,
              color: "var(--color-text-muted)",
              marginLeft: "var(--space-3)",
              letterSpacing: 0,
            }}
          >
            {savedProducts.length} {savedProducts.length === 1 ? "piece" : "pieces"}
          </span>
        </h1>
        <Link to="/" className="btn btn-ghost">
          ← Continue shopping
        </Link>
      </div>

      <div className="product-grid wishlist-grid">
        {savedProducts.map((product) => (
          <div key={product.id} className="wishlist-item-card">
            {/* Shared ProductCard component */}
            <ProductCard product={product} />

            {/* Action buttons under each product */}
            <div className="wishlist-item-actions">
              <button
                type="button"
                className={`btn btn-primary wishlist-add-cart-btn${addedMap[product.id] ? " added" : ""}`}
                onClick={() => handleAddToCart(product)}
                aria-label={`Add ${product.name} to cart`}
              >
                {addedMap[product.id] ? "✓ Added!" : "Add to cart"}
              </button>

              <button
                type="button"
                className="btn btn-ghost wishlist-remove-btn"
                onClick={() => removeFromWishlist(product.id)}
                aria-label={`Remove ${product.name} from wishlist`}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
