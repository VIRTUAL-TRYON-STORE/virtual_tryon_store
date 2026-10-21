import { useId } from "react";

// ── SearchToolbar ─────────────────────────────────────────────────────────────
// Props:
//   q          – current search text (controlled, from URL)
//   sort       – current sort key   (controlled, from URL)
//   maxPrice   – current price cap  (controlled, from URL)
//   priceMin   – lowest price in the full catalogue
//   priceMax   – highest price in the full catalogue
//   onQ        – setter: new text string
//   onSort     – setter: new sort key string
//   onMaxPrice – setter: new numeric cap
//   onClear    – resets all three filters at once
//
// Every control has a <label> so the toolbar works fully with a keyboard.
// The component is pure presentational — no fetch, no state.
export default function SearchToolbar({
  q,
  sort,
  maxPrice,
  priceMin,
  priceMax,
  category = "",
  onQ,
  onSort,
  onMaxPrice,
  onClear,
}) {
  // useId produces a stable, unique string for ARIA/label pairing.
  const searchId   = useId();
  const sortId     = useId();
  const priceId    = useId();

  const isFiltered =
    q.length > 0 ||
    sort !== "featured" ||
    maxPrice < priceMax ||
    (Boolean(category) && category !== "All");

  return (
    <div className="search-toolbar" role="search" aria-label="Filter and sort products">
      {/* ── Search box ─────────────────────────────────────────────────── */}
      <div className="toolbar-field toolbar-search">
        <label htmlFor={searchId} className="toolbar-label">
          Search
        </label>
        <div className="toolbar-input-wrap">
          {/* magnifier icon */}
          <svg className="toolbar-search-icon" viewBox="0 0 20 20" aria-hidden="true">
            <circle cx="8.5" cy="8.5" r="5.5" />
            <line x1="13" y1="13" x2="18" y2="18" />
          </svg>
          <input
            id={searchId}
            type="search"
            className="toolbar-input"
            placeholder="Search products…"
            value={q}
            onChange={(e) => onQ(e.target.value)}
            aria-label="Search products by name or description"
            autoComplete="off"
            spellCheck={false}
          />
          {q && (
            <button
              className="toolbar-clear-icon"
              onClick={() => onQ("")}
              aria-label="Clear search"
              title="Clear search"
              type="button"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Sort dropdown ──────────────────────────────────────────────── */}
      <div className="toolbar-field toolbar-sort">
        <label htmlFor={sortId} className="toolbar-label">
          Sort
        </label>
        <div className="toolbar-select-wrap">
          <select
            id={sortId}
            className="toolbar-select"
            value={sort}
            onChange={(e) => onSort(e.target.value)}
            aria-label="Sort products"
          >
            <option value="featured">Featured</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="name-asc">Name: A to Z</option>
          </select>
          {/* Custom chevron */}
          <svg className="toolbar-chevron" viewBox="0 0 12 8" aria-hidden="true">
            <path d="M1 1l5 5 5-5" />
          </svg>
        </div>
      </div>

      {/* ── Max price slider ───────────────────────────────────────────── */}
      <div className="toolbar-field toolbar-price">
        <label htmlFor={priceId} className="toolbar-label">
          Max price
          <span className="toolbar-price-value" aria-live="polite">
            ${Number(maxPrice).toFixed(0)}
          </span>
        </label>
        <div className="toolbar-slider-wrap">
          <span className="toolbar-slider-edge">${Number(priceMin).toFixed(0)}</span>
          <input
            id={priceId}
            type="range"
            className="toolbar-slider"
            min={priceMin}
            max={priceMax}
            step={1}
            value={maxPrice}
            onChange={(e) => onMaxPrice(Number(e.target.value))}
            aria-label={`Maximum price: $${Number(maxPrice).toFixed(0)}`}
          />
          <span className="toolbar-slider-edge">${Number(priceMax).toFixed(0)}</span>
        </div>
      </div>

      {/* ── Clear all button ───────────────────────────────────────────── */}
      {isFiltered && (
        <div className="toolbar-field toolbar-clear-wrap">
          <span className="toolbar-label" aria-hidden="true">&nbsp;</span>
          <button
            className="btn btn-ghost toolbar-clear-btn"
            onClick={onClear}
            type="button"
            aria-label="Clear all filters"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
