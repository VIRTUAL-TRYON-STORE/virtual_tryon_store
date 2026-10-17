import { Link } from "react-router-dom";

// ── ProductCard ───────────────────────────────────────────────────────────────
// Shared card component used in:
//   • ProductList   — the main catalogue grid
//   • ProductDetail — the "You may also like" related-products grid
//
// Having one component means the Live Try-On badge logic lives in exactly one
// place, so changes to the badge design automatically apply everywhere.
//
// Props:
//   product {object} — a product row from GET /api/products
//     .id             {number}
//     .name           {string}
//     .price          {number}
//     .image_url      {string}
//     .tryon_image_url {string|null}  — non-null → show the badge
export default function ProductCard({ product }) {
  return (
    <Link to={`/products/${product.id}`} className="product-card">
      <div className="card-img-wrap">
        <img
          src={product.image_url}
          alt={product.name}
          className="card-img"
          loading="lazy"
        />

        {/* Badge — only rendered when this product supports virtual try-on */}
        {product.tryon_image_url && (
          <span
            className="card-tryon-badge"
            aria-label="Virtual try-on available"
          >
            {/* Pulsing dot mirrors the "Live" indicator on the try-on panel */}
            <span className="card-tryon-badge-dot" aria-hidden="true" />
            Live Try-On
          </span>
        )}
      </div>

      <div className="card-body">
        <h2 className="card-name">{product.name}</h2>
        <p className="card-price">${product.price.toFixed(2)}</p>
      </div>
    </Link>
  );
}
