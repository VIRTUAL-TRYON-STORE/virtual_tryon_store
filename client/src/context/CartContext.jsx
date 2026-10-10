import { createContext, useContext, useState, useEffect } from "react";

// ── React Context explained ───────────────────────────────────────────────────
//
// Step 1 – createContext()
//   This creates the "channel" object. It has two parts:
//     • CartContext.Provider  — wraps the app, broadcasts the value
//     • useCartContext()      — any component calls this to read the value
//
//   We pass a default value of null here; it will only be used if a component
//   tries to consume the context without a Provider above it (a bug), so null
//   acts as a helpful signal that something is wrong.
//
const CartContext = createContext(null);

// ── CartProvider ─────────────────────────────────────────────────────────────
// This component owns all cart state. Wrap your whole app with it (see App.jsx)
// and every child — no matter how deeply nested — can call useCartContext()
// to read or update the cart without any props being passed down.
//
// localStorage persistence
//   On mount we read any previously saved cart from localStorage.
//   Whenever `items` changes we write the new value back.
//   This survives page refreshes because localStorage persists between sessions.
//
export function CartProvider({ children }) {
  // ── Lazy initial state ───────────────────────────────────────────────────
  // useState accepts a *function* as its argument (called a "lazy initialiser").
  // React calls it only once on the very first render, not on every render.
  // This is perfect for reading from localStorage because it is a synchronous
  // side-effect we only want to pay for once.
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem("cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // ── Persist to localStorage whenever the cart changes ────────────────────
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(items));
  }, [items]);

  // ── addToCart ─────────────────────────────────────────────────────────────
  // If the product is already in the cart we bump its quantity by 1.
  // Otherwise we append a new item with quantity 1.
  // We never mutate the existing array; we always return a *new* array so
  // React knows to re-render (same rule as with useState objects).
  function addToCart(product) {
    setItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }

  // ── removeFromCart ────────────────────────────────────────────────────────
  function removeFromCart(productId) {
    setItems((prev) => prev.filter((item) => item.id !== productId));
  }

  // ── updateQuantity ────────────────────────────────────────────────────────
  // Called when the user clicks + or - in the Cart page.
  // If the new quantity would fall to 0 or below, remove the item entirely.
  function updateQuantity(productId, newQuantity) {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      )
    );
  }

  // ── clearCart ─────────────────────────────────────────────────────────────
  function clearCart() {
    setItems([]);
  }

  // ── Derived values ────────────────────────────────────────────────────────
  // These are computed from `items` on every render; no separate state needed.
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // ── The "broadcast" value ─────────────────────────────────────────────────
  // Everything in this object is available to any child that calls
  // useCartContext(). Adding a new function here automatically makes it
  // available everywhere — no prop threading required.
  const value = {
    items,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    totalItems,
    totalPrice,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// ── useCartContext ────────────────────────────────────────────────────────────
// A tiny custom hook that wraps useContext so:
//   1. Import sites only need to import this one function (not CartContext too).
//   2. We can add a helpful error if someone forgets the Provider.
//
// Usage in any component:
//   const { items, addToCart, totalItems } = useCartContext();
//
export function useCartContext() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCartContext must be used inside a <CartProvider>");
  }
  return context;
}
