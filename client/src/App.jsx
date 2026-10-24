import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "./context/CartContext.jsx";
import { WishlistProvider } from "./context/WishlistContext.jsx";
import Header            from "./components/Header.jsx";
import Footer            from "./components/Footer.jsx";
import ProductList       from "./pages/ProductList.jsx";
import ProductDetail     from "./pages/ProductDetail.jsx";
import Cart              from "./pages/Cart.jsx";
import Wishlist          from "./pages/Wishlist.jsx";
import Checkout          from "./pages/Checkout.jsx";
import OrderConfirmation from "./pages/OrderConfirmation.jsx";
import TryOn             from "./tryon/TryOn.jsx";

// ── App ───────────────────────────────────────────────────────────────────────
// Context Providers:
//   <CartProvider> & <WishlistProvider> wrap BrowserRouter so that cart and
//   wishlist states are available across the entire component hierarchy.
export default function App() {
  return (
    <CartProvider>
      <WishlistProvider>
        <BrowserRouter>
          {/* Header is always visible on every page */}
          <Header />

          <Routes>
            <Route path="/"             element={<ProductList />}   />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/wishlist"     element={<Wishlist />}      />
            <Route path="/cart"         element={<Cart />}          />
            <Route path="/checkout"     element={<Checkout />}      />
            <Route path="/order/:id"    element={<OrderConfirmation />} />
            <Route path="/tryon-test"   element={<TryOn clothingImage="/shirts/shirt.png" showControls />} />
          </Routes>

          {/* Footer is always visible on every page */}
          <Footer />
        </BrowserRouter>
      </WishlistProvider>
    </CartProvider>
  );
}
