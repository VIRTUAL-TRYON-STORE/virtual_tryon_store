import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

// ── ProductDetail page ────────────────────────────────────────────────────────
// Mounted when the URL is "/products/:id".
//
// New pattern: useParams()
//   react-router-dom provides useParams() to read the dynamic segments from
//   the current URL. Here we get the "id" segment from "/products/:id" so we
//   can pass it straight to the API call.
export default function ProductDetail() {
  const { id } = useParams();   // reads ":id" from the URL

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

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
        </div>
      </div>
    </div>
  );
}
