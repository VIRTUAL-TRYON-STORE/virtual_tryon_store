import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

// ── OrderConfirmation page ─────────────────────────────────────────────────────
// Mounted at /order/:id.
//
// NEW PATTERN — useParams():
//   React Router injects the ":id" segment from the URL into the component via
//   the useParams() hook. So if the URL is /order/7, useParams() returns
//   { id: "7" }. We convert it to a number before sending it to the server.
//
// This page fetches GET /api/orders/:id on mount and shows a thank-you message
// with the full order details.
//
// Visual redesign:
//   • Whole page wrapped in .confirm-card (max-width 720px, centred)
//   • Animated green checkmark hero (.order-hero-icon)
//   • Two-column sub-layout: items card left, delivery details card right
//   • .confirm-actions row with centred CTA
export default function OrderConfirmation() {
  const { id } = useParams(); // grab :id from /order/:id

  const [order,   setOrder]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  // ── Fetch order on mount ───────────────────────────────────────────────────
  // The empty dependency array [] means this runs only once, when the
  // component first appears on screen — exactly like componentDidMount.
  useEffect(() => {
    async function fetchOrder() {
      try {
        const res = await fetch(`http://localhost:5000/api/orders/${id}`);
        if (res.status === 404) {
          setError(`Order #${id} was not found.`);
          setLoading(false);
          return;
        }
        if (!res.ok) {
          setError("Could not load order details.");
          setLoading(false);
          return;
        }
        const data = await res.json();
        setOrder(data);
      } catch {
        setError("Could not reach the server.");
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [id]); // re-run if :id ever changes (e.g., navigating between orders)

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return <p className="status-msg">Loading your order&hellip;</p>;
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="page">
        <div className="confirm-card">
          <p className="status-msg error">{error}</p>
          <div className="confirm-actions">
            <Link to="/" className="btn btn-primary" id="back-to-shop-btn">
              Back to Shop
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* ── Centred confirmation card ────────────────────────────────────── */}
      <div className="confirm-card">

        {/* Thank-you hero */}
        <div className="order-hero">
          <div className="order-hero-icon" aria-hidden="true">&#10003;</div>
          <h1>Thank you, {order.customer_name.split(" ")[0]}!</h1>
          <p className="subtitle" style={{ marginBottom: 0 }}>
            Your order <strong>#{order.id}</strong> has been placed successfully.
            We'll send a confirmation to <strong>{order.customer_email}</strong>.
          </p>
        </div>

        {/* Two-column: items ordered + delivery details */}
        <div className="order-layout">

          {/* Items ordered */}
          <section className="order-items-card">
            <h2 className="checkout-section-title">Items ordered</h2>
            <ul className="checkout-item-list">
              {order.items.map((item) => (
                <li key={item.id} className="checkout-item">
                  <div className="checkout-item-info" style={{ flex: 1 }}>
                    <p className="checkout-item-name">{item.product_name}</p>
                    <p className="checkout-item-meta">
                      Qty {item.quantity} &times; ${Number(item.unit_price).toFixed(2)}
                    </p>
                  </div>
                  <p className="checkout-item-subtotal">
                    ${(item.quantity * item.unit_price).toFixed(2)}
                  </p>
                </li>
              ))}
            </ul>

            <div className="checkout-total-row">
              <span>Order total</span>
              <span className="checkout-total-price">
                ${Number(order.total).toFixed(2)}
              </span>
            </div>
          </section>

          {/* Delivery details */}
          <aside className="order-details-card">
            <h2 className="checkout-section-title">Delivery details</h2>
            <dl className="order-detail-list">
              <dt>Name</dt>
              <dd>{order.customer_name}</dd>
              <dt>Email</dt>
              <dd>{order.customer_email}</dd>
              <dt>Address</dt>
              <dd style={{ whiteSpace: "pre-line" }}>{order.address}</dd>
              <dt>Placed at</dt>
              <dd>{new Date(order.created_at + "Z").toLocaleString()}</dd>
            </dl>
          </aside>

        </div>

        {/* CTA */}
        <div className="confirm-actions">
          <Link to="/" className="btn btn-primary" id="continue-shopping-btn">
            Continue shopping
          </Link>
        </div>

      </div>
    </div>
  );
}
