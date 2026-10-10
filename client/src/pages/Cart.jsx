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
export default function Cart() {
  const { items, removeFromCart, updateQuantity, clearCart, totalPrice } =
    useCartContext();

  // ── Empty-cart state ──────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="page">
        <h1>Your Cart</h1>
        <div className="cart-empty">
          <span className="cart-empty-icon">🛍️</span>
          <p>Your cart is empty!</p>
          <p className="cart-empty-sub">
            Head back to the collection and find something you love.
          </p>
          <Link to="/" className="btn btn-primary">
            Browse Collection
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="cart-header-row">
        <h1>Your Cart</h1>
        <button
          className="btn btn-ghost"
          onClick={clearCart}
          id="clear-cart-btn"
        >
          Clear all
        </button>
      </div>

      {/* ── Cart item list ─────────────────────────────────────────────── */}
      <ul className="cart-list">
        {items.map((item) => (
          <li key={item.id} className="cart-item">
            {/* Product image */}
            <img
              src={item.image_url}
              alt={item.name}
              className="cart-item-img"
            />

            {/* Name + price */}
            <div className="cart-item-info">
              <p className="cart-item-name">{item.name}</p>
              <p className="cart-item-price">${item.price.toFixed(2)} each</p>
            </div>

            {/* Quantity controls ─────────────────────────────────────────
                updateQuantity(id, newQty) handles going to 0 (removes item).
                We pass item.quantity - 1 or + 1 based on which button is clicked.
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
              className="btn btn-remove"
              onClick={() => removeFromCart(item.id)}
              aria-label={`Remove ${item.name}`}
              id={`remove-${item.id}`}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      {/* ── Order summary ─────────────────────────────────────────────────── */}
      <div className="cart-summary">
        <p className="cart-total-label">Order Total</p>
        <p className="cart-total-price">${totalPrice.toFixed(2)}</p>
        {/* Checkout button is intentionally disabled — not built yet */}
        <button className="btn btn-primary btn-full" disabled>
          Checkout (coming soon)
        </button>
        <Link to="/" className="btn btn-ghost btn-full">
          ← Continue Shopping
        </Link>
      </div>
    </div>
  );
}
