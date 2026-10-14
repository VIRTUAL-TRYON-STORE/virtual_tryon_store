import { Link } from "react-router-dom";
import { useCartContext } from "../context/CartContext.jsx";

// ── Cart page ─────────────────────────────────────────────────────────────────
// Mounted when the URL is "/cart".
//
// We call useCartContext() to read everything we need from the global cart:
//   • items         – the array of cart items
//   • removeFromCart – remove an item entirely
//   • updateQuantity – called when + or - is clicked
//   • clearCart      – empty the whole cart
//   • totalPrice     – pre-computed total (price × quantity for each item)
//
// Visual redesign:
//   • Two-column layout via .cart-layout grid (items left, summary right)
//   • Sticky order-summary card that follows the scroll
//   • Friendly empty-cart state with an illustration-style icon
export default function Cart() {
  const { items, removeFromCart, updateQuantity, clearCart, totalPrice } =
    useCartContext();

  // ── Empty-cart state ──────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="page">
        <div className="cart-empty">
          <span className="cart-empty-icon" aria-hidden="true">🛍️</span>
          <p>Your bag is empty</p>
          <p className="cart-empty-sub">
            Head back to the collection and find something you love.
          </p>
          <Link to="/" className="btn btn-primary" id="browse-collection-btn">
            Browse collection
          </Link>
        </div>
      </div>
    );
  }

  // ── Item count label for the heading ──────────────────────────────────────
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="page">
      {/* ── Page heading row ───────────────────────────────────────────────── */}
      <div className="cart-header-row">
        <h1>
          Your Bag
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
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
        </h1>
        <button
          className="btn btn-ghost"
          onClick={clearCart}
          id="clear-cart-btn"
        >
          Clear all
        </button>
      </div>

      {/* ── Two-column layout ─────────────────────────────────────────────── */}
      <div className="cart-layout">

        {/* LEFT — item list ───────────────────────────────────────────────── */}
        <ul className="cart-list">
          {items.map((item) => (
            <li key={item.id} className="cart-item">
              {/* Product image */}
              <img
                src={item.image_url}
                alt={item.name}
                className="cart-item-img"
              />

              {/* Name + unit price */}
              <div className="cart-item-info">
                <p className="cart-item-name">{item.name}</p>
                <p className="cart-item-price">${item.price.toFixed(2)} each</p>
              </div>

              {/* Quantity stepper ──────────────────────────────────────────
                  updateQuantity(id, newQty) handles going to 0 (removes item).
              */}
              <div className="cart-item-qty">
                <button
                  className="qty-btn"
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  aria-label="Decrease quantity"
                  id={`qty-minus-${item.id}`}
                >
                  −
                </button>
                <span className="qty-value">{item.quantity}</span>
                <button
                  className="qty-btn"
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  aria-label="Increase quantity"
                  id={`qty-plus-${item.id}`}
                >
                  +
                </button>
              </div>

              {/* Line total */}
              <p className="cart-item-subtotal">
                ${(item.price * item.quantity).toFixed(2)}
              </p>

              {/* Remove button */}
              <button
                className="btn-remove"
                onClick={() => removeFromCart(item.id)}
                aria-label={`Remove ${item.name}`}
                id={`remove-${item.id}`}
                title="Remove"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>

        {/* RIGHT — sticky order summary ────────────────────────────────────── */}
        <div className="cart-summary">
          <p className="cart-summary-title">Order summary</p>

          {/* One row per unique product */}
          {items.map((item) => (
            <div key={item.id} className="cart-summary-row">
              <span>
                {item.name}&nbsp;
                <span style={{ color: "var(--color-text-faint)" }}>
                  × {item.quantity}
                </span>
              </span>
              <span>${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}

          {/* Total */}
          <div className="cart-summary-row total">
            <span>Total</span>
            <span>${totalPrice.toFixed(2)}</span>
          </div>

          {/* CTA */}
          <Link
            to="/checkout"
            className="btn btn-primary btn-full"
            id="proceed-to-checkout-btn"
          >
            Proceed to checkout →
          </Link>
          <Link to="/" className="btn btn-ghost btn-full">
            ← Continue shopping
          </Link>
        </div>

      </div>
    </div>
  );
}
