import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import SearchToolbar from "../components/SearchToolbar.jsx";
import ProductCard  from "../components/ProductCard.jsx";

// ── ProductList page ──────────────────────────────────────────────────────────
// Patterns introduced / extended in this file:
//
// 1. useSearchParams (react-router-dom)
//    Works exactly like useState but reads/writes the URL's query string
//    instead of memory:
//      const [sp, setSp] = useSearchParams();
//      sp.get("q")          → reads ?q=…
//      setSp(next)          → writes a new URL without a full page reload
//    Because filters live in the URL, a refresh or shared link restores
//    them automatically with zero extra code.
//
// 2. useMemo
//    useMemo(() => expensiveCompute(a, b), [a, b]) caches the result and
//    only re-runs when a or b changes.  Here it computes the visible slice
//    of products from the full list — no second state copy, no risk of the
//    two arrays going out of sync.
export default function ProductList() {
  // ── Server data ────────────────────────────────────────────────────────────
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

  // ── Price bounds derived from the full catalogue ───────────────────────────
  // useMemo avoids recomputing on every render; only recalculates when
  // `products` changes (i.e. once, after the fetch).
  const { priceMin, priceMax } = useMemo(() => {
    if (products.length === 0) return { priceMin: 0, priceMax: 1000 };
    const prices = products.map((p) => p.price);
    return {
      priceMin: Math.floor(Math.min(...prices)),
      priceMax: Math.ceil(Math.max(...prices)),
    };
  }, [products]);

  // ── URL-backed filter state via useSearchParams ────────────────────────────
  // q        → ?q=hoodie
  // sort     → ?sort=price-asc  (default: "featured" = original API order)
  // price    → ?price=120       (default: full catalogue maximum)
  // category → ?category=Tops
  const [searchParams, setSearchParams] = useSearchParams();

  const q        = searchParams.get("q")        ?? "";
  const sort     = searchParams.get("sort")     ?? "featured";
  const category = searchParams.get("category") ?? "";
  // price param is parsed as a number; fall back to priceMax once loaded
  const maxPrice = searchParams.has("price")
    ? Number(searchParams.get("price"))
    : priceMax;

  // Categories and per-category product counts derived from loaded catalogue
  const categories = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const p of products) {
      if (p.category && !seen.has(p.category)) {
        seen.add(p.category);
        list.push(p.category);
      }
    }
    return list;
  }, [products]);

  const categoryCounts = useMemo(() => {
    const counts = {};
    for (const p of products) {
      if (p.category) {
        counts[p.category] = (counts[p.category] || 0) + 1;
      }
    }
    return counts;
  }, [products]);

  // Helper: update one param while preserving the rest
  function setParam(key, value) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === "" || value === null || value === undefined) {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
      return next;
    });
  }

  function clearFilters() {
    setSearchParams({});
  }

  // ── Derived visible list (filter → sort) ─────────────────────────────────
  // useMemo recomputes only when products, q, sort, maxPrice, or category changes.
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();

    // 1. Filter
    let list = products.filter((p) => {
      // Category filter
      const matchesCategory =
        !category || category === "All" || p.category === category;

      // Case-insensitive match on name or description
      const matchesText =
        needle === "" ||
        p.name.toLowerCase().includes(needle) ||
        (p.description ?? "").toLowerCase().includes(needle);

      // Price cap
      const matchesPrice = p.price <= maxPrice;

      return matchesCategory && matchesText && matchesPrice;
    });

    // 2. Sort
    switch (sort) {
      case "price-asc":
        list = [...list].sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list = [...list].sort((a, b) => b.price - a.price);
        break;
      case "name-asc":
        list = [...list].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        );
        break;
      // "featured" → keep original API order (no sort)
      default:
        break;
    }

    return list;
  }, [products, q, sort, maxPrice, category]);

  // ── Early returns ──────────────────────────────────────────────────────────
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

      {/* ── Product Grid section ─────────────────────────────────────────── */}
      <section
        id="collection"
        className="product-grid-section"
        aria-label="Product collection"
      >
        {/* ── Search / sort / price toolbar ──────────────────────────── */}
        {/* Only rendered once products have loaded so price bounds are known */}
        {!loading && (
          <SearchToolbar
            q={q}
            sort={sort}
            maxPrice={maxPrice}
            priceMin={priceMin}
            priceMax={priceMax}
            category={category}
            onQ={(v)        => setParam("q",     v)}
            onSort={(v)     => setParam("sort",  v === "featured" ? null : v)}
            onMaxPrice={(v) => setParam("price", v >= priceMax ? null : v)}
            onClear={clearFilters}
          />
        )}

        {/* ── Category filter chips ──────────────────────────────────── */}
        {!loading && products.length > 0 && (
          <div
            className="category-chips-row"
            role="tablist"
            aria-label="Filter by product category"
          >
            <button
              type="button"
              role="tab"
              aria-selected={!category || category === "All"}
              className={`category-chip${!category || category === "All" ? " active" : ""}`}
              onClick={() => setParam("category", null)}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={category === cat}
                className={`category-chip${category === cat ? " active" : ""}`}
                onClick={() => setParam("category", cat === category ? null : cat)}
              >
                {cat} ({categoryCounts[cat] || 0})
              </button>
            ))}
          </div>
        )}

        {/* ── Label row: count + "X of Y" ────────────────────────────── */}
        <div className="product-grid-label">
          <span>
            {loading
              ? "Loading…"
              : visible.length === products.length
              ? `${products.length} piece${products.length !== 1 ? "s" : ""}`
              : `Showing ${visible.length} of ${products.length}`}
          </span>
        </div>

        <div className="product-grid">
          {/* ── Skeleton placeholders while loading ──────────────────── */}
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

          {/* ── Real product cards ─────────────────────────────────────── */}
          {!loading &&
            visible.map((product) => (
              // ProductCard is the shared card component — badge logic lives there.
              <ProductCard key={product.id} product={product} />
            ))}
        </div>

        {/* ── Empty state ────────────────────────────────────────────────── */}
        {!loading && visible.length === 0 && (
          <div className="no-results" role="status" aria-live="polite">
            <span className="no-results-icon" aria-hidden="true">🔍</span>
            <p className="no-results-heading">No products match your filters.</p>
            <p className="no-results-sub">
              Try a different search term or adjust the price range.
            </p>
            <button
              className="btn btn-primary"
              onClick={clearFilters}
              type="button"
            >
              Clear filters
            </button>
          </div>
        )}
      </section>
    </>
  );
}
