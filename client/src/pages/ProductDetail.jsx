import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useCartContext } from "../context/CartContext.jsx";
import TryOn from "../tryon/TryOn.jsx";
import ProductCard from "../components/ProductCard.jsx";

// ── ProductDetail page ────────────────────────────────────────────────────────
// Mounted when the URL is "/products/:id".
//
// Layout (new two-column):
//   Desktop  — LEFT column = product image card (or live TryOn camera card when
//              Try-On is active). RIGHT column = back link, name, price,
//              description, action buttons.
//   Mobile   — single column; media stacks above the info block.
//
// Virtual Try-On integration (logic UNCHANGED):
//   • "Try it on" button only rendered when product.tryon_image_url exists.
//   • TryOn mounts ONLY after the button is clicked (camera off by default).
//   • Unmounting via the Close button terminates all webcam tracks and MediaPipe.
//   • "Adjust fit" toggle controls showControls for slider tuning.
//   • "Add to Cart" remains fully active while try-on is open.
//   • On desktop the camera card replaces the product image in the LEFT column.
export default function ProductDetail() {
  const { id } = useParams();
  const { addToCart } = useCartContext();

  const [product, setProduct]           = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [isTryingOn, setIsTryingOn]     = useState(false);
  const [showControls, setShowControls] = useState(false);

  // Brief "Added!" feedback — reset after 1.5 s
  const [added, setAdded] = useState(false);

  // Re-fetch whenever :id changes
  useEffect(() => {
    // When the user clicks a related product, scroll to top and reset try-on state
    window.scrollTo(0, 0);
    setIsTryingOn(false);
    setShowControls(false);
    setLoading(true);
    setError(null);

    // Fetch the current product details
    fetch(`/api/products/${id}`)
      .then((res) => {
        if (res.status === 404) throw new Error("not-found");
        if (!res.ok)            throw new Error(`Server error: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setProduct(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });

    // Fetch "You may also like" related products (up to 4 other items, try-on items first)
    fetch("/api/products")
      .then((res) => {
        if (!res.ok) return [];
        return res.json();
      })
      .then((all) => {
        const others = all.filter((p) => String(p.id) !== String(id));
        others.sort((a, b) => {
          const aHas = Boolean(a.tryon_image_url);
          const bHas = Boolean(b.tryon_image_url);
          if (aHas && !bHas) return -1;
          if (!aHas && bHas) return 1;
          return 0;
        });
        setRelatedProducts(others.slice(0, 4));
      })
      .catch(() => {
        setRelatedProducts([]);
      });
  }, [id]);

  function handleAddToCart() {
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="page">
        <div className="pd-layout">
          {/* Left column skeleton — mimics the image card */}
          <div className="pd-media">
            <div className="pd-img-card skeleton" style={{ aspectRatio: "4/5", borderRadius: "var(--radius-xl)" }} />
          </div>

          {/* Right column skeleton — mimics the info block */}
          <div className="pd-info">
            <div className="skeleton skeleton-line short" style={{ height: "12px", width: "120px", marginBottom: "var(--space-6)" }} />
            <div className="skeleton skeleton-line medium" style={{ height: "40px", marginBottom: "var(--space-3)" }} />
            <div className="skeleton skeleton-line short" style={{ height: "28px", width: "100px", marginBottom: "var(--space-5)" }} />
            <div className="skeleton" style={{ height: "96px", borderRadius: "var(--radius-md)", marginBottom: "var(--space-5)" }} />
            <div style={{ display: "flex", gap: "var(--space-3)" }}>
              <div className="skeleton" style={{ height: "46px", width: "148px", borderRadius: "var(--radius-md)" }} />
              <div className="skeleton" style={{ height: "46px", width: "120px", borderRadius: "var(--radius-md)" }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Error / Not-found state ─────────────────────────────────────────────────
  if (error) {
    const isNotFound = error === "not-found";
    return (
      <div className="page">
        <div className="pd-not-found">
          <span className="pd-not-found-icon" aria-hidden="true">
            {isNotFound ? "🕵️" : "⚠️"}
          </span>
          <h1 className="pd-not-found-heading">
            {isNotFound ? "Product not found" : "Something went wrong"}
          </h1>
          <p className="pd-not-found-sub">
            {isNotFound
              ? "This product doesn't exist or may have been removed from the catalogue."
              : error}
          </p>
          <Link to="/" className="btn btn-primary" id="back-to-collection-btn">
            ← Back to collection
          </Link>
        </div>
      </div>
    );
  }

  const hasTryOn = Boolean(product.tryon_image_url);

  return (
    <div className="page">
      {/*
        pd-layout — two-column grid on desktop; single column on mobile.
        When isTryingOn is true the LEFT column renders the live camera card
        instead of the static product image. The modifier class pd-tryon-active
        can be used in CSS to widen the left column if needed.
      */}
      <div className={`pd-layout${isTryingOn ? " pd-tryon-active" : ""}`}>

        {/* ── LEFT — Media column ─────────────────────────────────────────── */}
        <div className="pd-media">
          {isTryingOn ? (
            /*
              Camera panel — replaces the product image on desktop while
              Try-On is active. The TryOn component is mounted here so the
              webcam feed appears in the left column exactly where the image was.
            */
            <div className="pd-tryon-card">
              {/* Header: Live badge · Adjust fit toggle · Close */}
              <div className="pd-tryon-header">
                <span className="tryon-status-badge">
                  <span className="tryon-status-dot" />
                  Live Try-On
                </span>

                <label className="tryon-fit-toggle" htmlFor="adjust-fit-toggle">
                  <input
                    type="checkbox"
                    id="adjust-fit-toggle"
                    checked={showControls}
                    onChange={(e) => setShowControls(e.target.checked)}
                  />
                  Adjust fit
                </label>

                <button
                  type="button"
                  className="btn btn-ghost btn-close-tryon"
                  onClick={() => setIsTryingOn(false)}
                  id="close-tryon-btn"
                  aria-label="Close try-on"
                >
                  ✕ Close
                </button>
              </div>

              {/* Camera feed */}
              <div className="tryon-view-container">
                <TryOn
                  clothingImage={product.tryon_image_url}
                  showControls={showControls}
                />
              </div>

              {/* Tip notice below the feed */}
              <div className="tryon-tip" role="note">
                <span className="tryon-tip-icon">💡</span>
                <p className="tryon-tip-text">
                  Stand back so both shoulders are visible, and allow the camera.
                </p>
              </div>
            </div>
          ) : (
            /* Static product image card */
            <div className="pd-img-card">
              <img
                src={product.image_url}
                alt={product.name}
                className="pd-img"
              />
            </div>
          )}
        </div>

        {/* ── RIGHT — Info column ─────────────────────────────────────────── */}
        <div className="pd-info">
          {/* Back link at the very top of the info block */}
          <Link to="/" className="back-link" id="back-to-products-link">
            ← Back to collection
          </Link>

          {/* Category label above product name */}
          {product.category && (
            <Link
              to={`/?category=${encodeURIComponent(product.category)}`}
              className="pd-category-label"
              id="product-category-link"
            >
              {product.category}
            </Link>
          )}

          <h1 className="detail-name">{product.name}</h1>

          <p className="detail-price">${product.price.toFixed(2)}</p>

          <p className="detail-description">{product.description}</p>

          {/* ── Action buttons ───────────────────────────────────────────────
              Add to Cart is always active.
              Try it on only shown when product has tryon_image_url and camera
              is not open. Close Try-On appears as a secondary action in this
              column while try-on is running.
          */}
          <div className="detail-actions">
            <button
              type="button"
              className={`btn btn-primary add-to-cart-btn${added ? " added" : ""}`}
              onClick={handleAddToCart}
              id="add-to-cart-btn"
            >
              {added ? "✓ Added!" : "Add to Cart"}
            </button>

            {hasTryOn && !isTryingOn && (
              <button
                type="button"
                className="btn btn-tryon"
                onClick={() => setIsTryingOn(true)}
                id="try-on-btn"
              >
                <svg
                  className="tryon-btn-icon"
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                Try it on
              </button>
            )}

            {isTryingOn && (
              <button
                type="button"
                className="btn btn-ghost btn-close-tryon-alt"
                onClick={() => setIsTryingOn(false)}
                id="close-tryon-alt-btn"
              >
                Close Try-On
              </button>
            )}
          </div>

          {/* Quick "View Cart →" link shown briefly after adding */}
          {added && (
            <Link to="/cart" className="view-cart-link">
              View Cart →
            </Link>
          )}
        </div>

      </div>{/* /pd-layout */}

      {/* ── Related products: "You may also like" ──────────────────────── */}
      {relatedProducts.length > 0 && (
        <section className="related-section" aria-labelledby="related-heading">
          <div className="related-header">
            <h2 id="related-heading" className="related-title">
              You may also like
            </h2>
            <span className="related-sub">
              Curated pieces from our collection
            </span>
          </div>

          <div className="product-grid">
            {relatedProducts.map((relProduct) => (
              <ProductCard key={relProduct.id} product={relProduct} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

