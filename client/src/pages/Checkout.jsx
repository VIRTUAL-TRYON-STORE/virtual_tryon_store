import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCartContext } from "../context/CartContext.jsx";

// ── Checkout page ─────────────────────────────────────────────────────────────
// Mounted at /checkout.
//
// NEW PATTERNS introduced here:
//
// 1. Controlled form inputs.
//    Each <input> has a value wired to a piece of state, and an onChange that
//    updates that state. React is the single source of truth for the form —
//    this is called a "controlled component".
//
// 2. Disabling a button while a fetch is in-flight.
//    We use a `loading` boolean state. When we set it to true before the fetch
//    and false after, React automatically re-renders and the disabled prop
//    prevents double-submits.
//
// 3. Displaying server errors.
//    The POST response may return a 400 with { error: "..." }. We read that
//    message and put it in `serverError` state, then render it in the UI.
//
export default function Checkout() {
  const { items, totalPrice, clearCart } = useCartContext();
  const navigate = useNavigate();

  // ── Form state ─────────────────────────────────────────────────────────────
  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("");
  const [address, setAddress] = useState("");

  // ── Async state ────────────────────────────────────────────────────────────
  const [loading,     setLoading]     = useState(false);
  const [serverError, setServerError] = useState("");

  // ── Empty-cart guard ───────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="page">
        <div className="cart-empty">
          <span className="cart-empty-icon">🛍️</span>
          <p>Your cart is empty!</p>
          <p className="cart-empty-sub">
            Add some items before checking out.
          </p>
          <Link to="/" className="btn btn-primary">
            Browse Collection
          </Link>
        </div>
      </div>
    );
  }

  // ── Submit handler ─────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();           // prevent the browser's default form GET/POST
    setServerError("");
    setLoading(true);

    // Build the payload the API expects.
    // We send productId + quantity only — the server looks up prices itself.
    const payload = {
      name,
      email,
      address,
      items: items.map((item) => ({
        productId: item.id,
        quantity:  item.quantity,
      })),
    };

    try {
      const res = await fetch("http://localhost:5000/api/orders", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        // The server sent back a 4xx/5xx with { error: "..." }
        setServerError(data.error || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      // ── Success ─────────────────────────────────────────────────────────
      // 1. Clear the cart (CartContext wipes localStorage too via useEffect).
      // 2. Navigate to the confirmation page.
      clearCart();
      navigate(`/order/${data.orderId}`);

    } catch (err) {
      // Network error (server is down, etc.)
      setServerError("Could not reach the server. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <h1>Checkout</h1>
      <p className="subtitle">Review your order and enter your details below.</p>

      {/* Demo payment notice */}
      <div className="demo-notice" role="note">
        <span className="demo-notice-icon">🔒</span>
        <span>
          <strong>Demo mode — no payment is taken.</strong> This is a
          prototype. Nothing will be charged. Enter any details you like.
        </span>
      </div>

      <div className="checkout-layout">

        {/* Customer details form */}
        <form
          className="checkout-form"
          onSubmit={handleSubmit}
          id="checkout-form"
          noValidate
        >
          <h2 className="checkout-section-title">Your details</h2>

          <div className="form-field">
            <label htmlFor="checkout-name">Full name</label>
            <input
              id="checkout-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              required
              disabled={loading}
            />
          </div>

          <div className="form-field">
            <label htmlFor="checkout-email">Email address</label>
            <input
              id="checkout-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              required
              disabled={loading}
            />
          </div>

          <div className="form-field">
            <label htmlFor="checkout-address">Shipping address</label>
            <textarea
              id="checkout-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={"123 Main Street\nSpringfield, IL 62701"}
              rows={3}
              required
              disabled={loading}
            />
          </div>

          {/* Server-side error shown here */}
          {serverError && (
            <p className="checkout-error" role="alert" id="checkout-error-msg">
              &#9888; {serverError}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-full checkout-submit-btn"
            disabled={loading}
            id="place-order-btn"
          >
            {loading ? "Placing order\u2026" : "Place order"}
          </button>

          <Link to="/cart" className="btn btn-ghost btn-full">
            &larr; Back to cart
          </Link>
        </form>

        {/* Order summary */}
        <aside className="checkout-summary">
          <h2 className="checkout-section-title">Order summary</h2>

          <ul className="checkout-item-list">
            {items.map((item) => (
              <li key={item.id} className="checkout-item">
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="checkout-item-img"
                />
                <div className="checkout-item-info">
                  <p className="checkout-item-name">{item.name}</p>
                  <p className="checkout-item-meta">
                    Qty {item.quantity} &times; ${item.price.toFixed(2)}
                  </p>
                </div>
                <p className="checkout-item-subtotal">
                  ${(item.price * item.quantity).toFixed(2)}
                </p>
              </li>
            ))}
          </ul>

          <div className="checkout-total-row">
            <span>Order total</span>
            <span className="checkout-total-price">${totalPrice.toFixed(2)}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
