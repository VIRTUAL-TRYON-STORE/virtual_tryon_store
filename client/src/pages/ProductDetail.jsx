import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useCartContext } from "../context/CartContext.jsx";

// ── ProductDetail page ────────────────────────────────────────────────────────
// Mounted when the URL is "/products/:id".
//
// New pattern: useParams()
//   react-router-dom provides useParams() to read the dynamic segments from
//   the current URL. Here we get the "id" segment from "/products/:id" so we
//   can pass it straight to the API call.
//
// New pattern: useCartContext()
//   Instead of receiving addToCart as a prop, we call useCartContext() to
//   reach directly into the CartContext and pull out the function we need.
//   This is the pay-off of Context: no prop drilling at all.
export default function ProductDetail() {
  const { id } = useParams();          // reads ":id" from the URL
  const { addToCart } = useCartContext(); // pulls addToCart from the cart context

  const [product, setProduct]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  // Brief "Added!" feedback so the user knows their click was registered.
  // We reset it to false after 1.5 s with a setTimeout inside useEffect.
  const [added, setAdded] = useState(false);

  // Re-fetch whenever the id in the URL changes (the [id] dependency array).
  useEffect(() => {
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

      <div className="detail-card">
        <img
          src={product.image_url}
          alt={product.name}
          className="detail-img"
        />
        <div className="detail-info">
          <h1 className="detail-name">{product.name}</h1>
          <p className="detail-price">${product.price.toFixed(2)}</p>
          <p className="detail-description">{product.description}</p>

          {/* ── Add to cart button ────────────────────────────────────────
              The button text switches between "Add to Cart" and "✓ Added!"
              based on the `added` state flag.
              The `added` CSS class changes the button colour to green briefly.
          */}
          <button
            className={`btn btn-primary add-to-cart-btn${added ? " added" : ""}`}
            onClick={handleAddToCart}
            id="add-to-cart-btn"
          >
            {added ? "✓ Added!" : "Add to Cart"}
          </button>

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
