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
//
// Visual redesign:
//   • Hero section with eyebrow text, serif headline, subtitle, CTA button
//   • Skeleton placeholders shown while loading
//   • 4-col responsive grid; each card has 4:5 aspect-ratio, object-fit:contain
//     + padding so transparent PNG cutouts look great and photos still work
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

  if (error) return <p className="status-msg error">Error: {error}</p>;

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="hero" aria-label="Welcome hero">
        <p className="hero-eyebrow">New Season · 2025</p>
        <h1 className="hero-headline">
          Wear it before<br />
          <em>you own it.</em>
        </h1>
        <p className="hero-sub">
          Browse our curated collection and virtually try on every piece — so
          you always love what arrives at your door.
        </p>
        <a href="#collection" className="btn btn-primary hero-cta">
          Shop the collection
        </a>
      </section>

      {/* Decorative divider */}
      <div className="hero-divider" aria-hidden="true">
        <div className="hero-divider-line" />
        <span className="hero-divider-mark">✦</span>
        <div className="hero-divider-line" />
      </div>

      {/* ── Product Grid ─────────────────────────────────────────────────── */}
      <section
        id="collection"
        className="product-grid-section"
        aria-label="Product collection"
      >
        {/* Label row: "X products" */}
        <div className="product-grid-label">
          <span>
            {loading ? "Loading…" : `${products.length} pieces`}
          </span>
        </div>

        <div className="product-grid">
          {/* ── Skeleton placeholders while loading ──────────────────────── */}
          {loading &&
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton-card" aria-hidden="true">
                <div className="skeleton skeleton-img" />
                <div className="skeleton-body">
                  <div className="skeleton skeleton-line medium" />
                  <div className="skeleton skeleton-line short" />
                </div>
              </div>
            ))}

          {/* ── Real product cards ────────────────────────────────────────── */}
          {!loading &&
            products.map((product) => (
              // New pattern: <Link to="...">
              //   react-router-dom's <Link> renders an <a> tag but intercepts the
              //   click so the browser never does a full page reload — React swaps
              //   the component instead. Always use <Link> for in-app navigation.
              <Link
                key={product.id}
                to={`/products/${product.id}`}
                className="product-card"
              >
                {/* Image container with neutral background for cutouts & photos */}
                <div className="card-img-wrap">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="card-img"
                    loading="lazy"
                  />
                </div>
                <div className="card-body">
                  <h2 className="card-name">{product.name}</h2>
                  <p className="card-price">${product.price.toFixed(2)}</p>
                </div>
              </Link>
            ))}
        </div>
      </section>
    </>
  );
}
