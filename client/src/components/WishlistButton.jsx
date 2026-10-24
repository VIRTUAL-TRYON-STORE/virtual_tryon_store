import { useWishlistContext } from "../context/WishlistContext.jsx";

// ── WishlistButton ────────────────────────────────────────────────────────────
//
// An accessible, interactive heart toggle button.
//
// Key implementation details:
// 1. Accessibility:
//    - Uses `aria-pressed={isSaved}` to inform assistive technologies of the toggle state.
//    - Dynamic `aria-label` (e.g. "Add Classic White Tee to wishlist" /
//      "Remove Classic White Tee from wishlist") clarifies the action for screen reader users.
//    - Real <button type="button"> element guarantees full keyboard operability
//      (Focusable via Tab, activates on Enter and Space).
//
// 2. Click Handling in Clickable Cards (stopPropagation & preventDefault):
//    When this button is placed inside a clickable card (such as `<Link to="...">`),
//    clicking it would naturally trigger the link and navigate to the product page.
//    - `e.stopPropagation()` stops the DOM click event from bubbling up to parent
//      elements (the enclosing <Link> / <a> tag).
//    - `e.preventDefault()` suppresses the default action of the event, ensuring
//      client-side routers or browsers do not initiate navigation.
//
export default function WishlistButton({
  product,
  productId,
  productName,
  size = "md",
  className = "",
}) {
  const { isInWishlist, toggleWishlist } = useWishlistContext();

  const id = product?.id ?? productId;
  const name = product?.name ?? productName ?? "Product";
  const isSaved = isInWishlist(id);

  function handleClick(e) {
    // 1. Stop the click event from bubbling to parent elements (e.g. <Link to="..."> in ProductCard)
    e.stopPropagation();

    // 2. Prevent default browser / router navigation behavior
    e.preventDefault();

    if (id !== undefined && id !== null) {
      toggleWishlist(id);
    }
  }

  const ariaLabel = isSaved
    ? `Remove ${name} from wishlist`
    : `Add ${name} to wishlist`;

  return (
    <button
      type="button"
      className={`wishlist-btn wishlist-btn-${size}${isSaved ? " is-saved" : ""} ${className}`.trim()}
      onClick={handleClick}
      aria-pressed={isSaved}
      aria-label={ariaLabel}
      title={ariaLabel}
      data-product-id={id}
    >
      <svg
        className="wishlist-heart-icon"
        viewBox="0 0 24 24"
        aria-hidden="true"
        fill={isSaved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
