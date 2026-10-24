import { createContext, useContext, useState, useEffect } from "react";

// ── WishlistContext ──────────────────────────────────────────────────────────
//
// React Context for managing the user's client-side wishlist.
//
// Why store IDs only instead of whole product objects?
// 1. Freshness: Prices, titles, descriptions, and stock change on the server.
//    If we stored whole product snapshots in localStorage, users would see stale
//    prices and out-of-date information weeks later. Storing only IDs ensures
//    that whenever the catalogue or a product page loads, product data is always
//    fetched fresh from the server.
// 2. Storage efficiency & safety: localStorage has a strict ~5MB quota per origin.
//    Storing just numeric IDs (e.g. [1, 4, 7]) uses a tiny fraction of space
//    compared to storing bulky product objects with image URLs and descriptions.
// 3. Single source of truth: The server DB remains the authoritative record
//    for product details; the client merely tracks user preferences (which IDs).
//
const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  // ── Lazy initial state with safe fallback ──────────────────────────────────
  // Reads the saved wishlist array from localStorage once on initial mount.
  // Wrapped in a try/catch block so that missing keys, corrupted JSON strings,
  // or restricted browser storage settings fall back gracefully to [] instead
  // of throwing an unhandled exception and crashing the whole React app.
  const [wishlist, setWishlist] = useState(() => {
    try {
      const saved = localStorage.getItem("wishlist");
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      // Ensure the parsed data is actually an array of IDs
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // ── Persist to localStorage whenever wishlist changes ──────────────────────
  useEffect(() => {
    try {
      localStorage.setItem("wishlist", JSON.stringify(wishlist));
    } catch (err) {
      console.error("Failed to save wishlist to localStorage:", err);
    }
  }, [wishlist]);

  // ── Helper methods ─────────────────────────────────────────────────────────

  // Check if a given productId is currently saved in the wishlist.
  // Using String comparison handles both string IDs (e.g. from URL params)
  // and numeric IDs (from database records) without type-mismatch bugs.
  function isInWishlist(productId) {
    if (productId === undefined || productId === null) return false;
    return wishlist.some((id) => String(id) === String(productId));
  }

  // Toggles an item in or out of the wishlist.
  function toggleWishlist(productId) {
    if (productId === undefined || productId === null) return;
    setWishlist((prev) => {
      const exists = prev.some((id) => String(id) === String(productId));
      if (exists) {
        return prev.filter((id) => String(id) !== String(productId));
      }
      return [...prev, productId];
    });
  }

  // Explicitly remove an item by its ID.
  function removeFromWishlist(productId) {
    if (productId === undefined || productId === null) return;
    setWishlist((prev) => prev.filter((id) => String(id) !== String(productId)));
  }

  // Explicitly add an item by its ID if not already present.
  function addToWishlist(productId) {
    if (productId === undefined || productId === null) return;
    setWishlist((prev) => {
      if (prev.some((id) => String(id) === String(productId))) return prev;
      return [...prev, productId];
    });
  }

  // Clear all saved wishlist IDs.
  function clearWishlist() {
    setWishlist([]);
  }

  // ── Derived values ─────────────────────────────────────────────────────────
  const count = wishlist.length;

  const value = {
    wishlist,
    wishlistIds: wishlist,
    toggleWishlist,
    isInWishlist,
    removeFromWishlist,
    addToWishlist,
    clearWishlist,
    count,
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

// ── useWishlistContext ───────────────────────────────────────────────────────
// Custom hook to consume the WishlistContext with an informative boundary error.
export function useWishlistContext() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlistContext must be used inside a <WishlistProvider>");
  }
  return context;
}

// Convenience alias
export const useWishlist = useWishlistContext;
