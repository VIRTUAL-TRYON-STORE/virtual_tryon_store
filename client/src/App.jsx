import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "./context/CartContext.jsx";
import Header        from "./components/Header.jsx";
import ProductList   from "./pages/ProductList.jsx";
import ProductDetail from "./pages/ProductDetail.jsx";
import Cart          from "./pages/Cart.jsx";

// ── App ───────────────────────────────────────────────────────────────────────
// Two new patterns introduced here:
//
// 1. <CartProvider> wraps everything.
//    CartProvider is the Context "broadcast tower". By wrapping BrowserRouter
//    (and therefore every page) inside it, every component in the tree can call
//    useCartContext() and get the cart state. If we put CartProvider *inside*
//    BrowserRouter we'd also be fine, but wrapping BrowserRouter keeps things
//    tidy and makes it clear that the cart outlives any individual route.
//
// 2. <Header> lives outside <Routes>.
//    <Routes> only renders ONE matching route at a time. Anything placed
//    *outside* <Routes> (but still inside <BrowserRouter>) is always visible,
//    regardless of the current URL. That's exactly what we want for a header.
export default function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        {/* Header is always visible on every page */}
        <Header />

        <Routes>
          <Route path="/"             element={<ProductList />}   />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/cart"         element={<Cart />}          />
        </Routes>
      </BrowserRouter>
    </CartProvider>
  );
}
