import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useCartContext } from "../context/CartContext.jsx";
import TryOn from "../tryon/TryOn.jsx";

// ── ProductDetail page ────────────────────────────────────────────────────────
// Mounted when the URL is "/products/:id".
//
// Virtual Try-On integration:
//   - "Try it on" button only rendered when product.tryon_image_url exists.
//   - TryOn component mounts in place on click (starts camera feed only on demand).
//   - Unmounting via the Close button terminates all webcam tracks and MediaPipe.
//   - "Adjust fit" toggle controls showControls for slider tuning.
//   - "Add to Cart" remains fully active while trying on garments.
export default function ProductDetail() {
  const { id } = useParams();          // reads ":id" from the URL
  const { addToCart } = useCartContext(); // pulls addToCart from the cart context

  const [product, setProduct]           = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [isTryingOn, setIsTryingOn]     = useState(false);
  const [showControls, setShowControls] = useState(false);

  // Brief "Added!" feedback so the user knows their click was registered.
  // We reset it to false after 1.5 s with a setTimeout inside useEffect.
  const [added, setAdded] = useState(false);

  // Re-fetch whenever the id in the URL changes (the [id] dependency array).
  useEffect(() => {
    setIsTryingOn(false);
    setShowControls(false);
    setLoading(true);
    setError(null);

    fetch(`/api/products/${id}`)
      .then((res) => {
        if (res.status === 404) throw new Error("Product not found");
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
  }, [id]);

  // ── handleAddToCart ────────────────────────────────────────────────────────
  // Calls addToCart with the full product object, then briefly shows "Added!"
  // text on the button so the user has clear visual feedback.
  function handleAddToCart() {
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  if (loading) return <p className="status-msg">Loading product…</p>;
  if (error)   return <p className="status-msg error">Error: {error}</p>;

  return (
    <div className="page">
      {/* Back link — navigates to the list without a full reload */}
      <Link to="/" className="back-link">← Back to collection</Link>

      <div className={`detail-card${isTryingOn ? " is-tryon-active" : ""}`}>
        {/* Media display: either the static product image or the live TryOn view */}
        <div className="detail-media">
          {isTryingOn ? (
            <div className="tryon-panel">
              <div className="tryon-panel-header">
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

              <div className="tryon-view-container">
                <TryOn
                  clothingImage={product.tryon_image_url}
                  showControls={showControls}
                />
              </div>
            </div>
          ) : (
            <img
              src={product.image_url}
              alt={product.name}
              className="detail-img"
            />
          )}
        </div>

        <div className="detail-info">
          <h1 className="detail-name">{product.name}</h1>
          <p className="detail-price">${product.price.toFixed(2)}</p>

          {/* Short tip displayed next to the try-on when open */}
          {isTryingOn && (
            <div className="tryon-tip" role="note">
              <span className="tryon-tip-icon">💡</span>
              <p className="tryon-tip-text">
                Stand back so both shoulders are visible, and allow the camera.
              </p>
            </div>
          )}

          <p className="detail-description">{product.description}</p>

          {/* ── Action buttons ─────────────────────────────────────────
              Add to cart remains accessible while try-on is active.
              Try it on button is only shown if product has tryon_image_url.
          */}
          <div className="detail-actions">
            <button
              className={`btn btn-primary add-to-cart-btn${added ? " added" : ""}`}
              onClick={handleAddToCart}
              id="add-to-cart-btn"
            >
              {added ? "✓ Added!" : "Add to Cart"}
            </button>

            {Boolean(product.tryon_image_url) && !isTryingOn && (
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
              >
                Close Try-On
              </button>
            )}
          </div>

          {/* Quick link to cart after adding */}
          {added && (
            <Link to="/cart" className="view-cart-link">
              View Cart →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
