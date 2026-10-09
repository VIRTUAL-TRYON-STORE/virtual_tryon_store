import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

// ── ProductList page ──────────────────────────────────────────────────────────
// This component is mounted when the URL is "/".
// It fetches the full product catalogue from the Express API and renders each
// product as a card inside a CSS grid.
//
// New pattern: useEffect + fetch
//   useEffect(() => { ... }, []) runs *once* after the first render (the empty
//   dependency array [] means "no dependencies → only run on mount").
//   Inside it we call fetch() to hit our API and store the result in state with
//   useState so React re-renders when the data arrives.
export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

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

  if (loading) return <p className="status-msg">Loading products…</p>;
  if (error)   return <p className="status-msg error">Error: {error}</p>;

  return (
    <div className="page">
      <h1>Our Collection</h1>
      <p className="subtitle">
        {products.length} items — click any card to see full details
      </p>

      <div className="product-grid">
        {products.map((product) => (
          // New pattern: <Link to="...">
          //   react-router-dom's <Link> renders an <a> tag but intercepts the
          //   click so the browser never does a full page reload — React swaps
          //   the component instead. Always use <Link> for in-app navigation.
          <Link
            key={product.id}
            to={`/products/${product.id}`}
            className="product-card"
          >
            <img
              src={product.image_url}
              alt={product.name}
              className="card-img"
            />
            <div className="card-body">
              <h2 className="card-name">{product.name}</h2>
              <p className="card-price">${product.price.toFixed(2)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
