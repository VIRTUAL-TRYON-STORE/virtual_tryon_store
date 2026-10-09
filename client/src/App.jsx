import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProductList   from "./pages/ProductList.jsx";
import ProductDetail from "./pages/ProductDetail.jsx";

// ── App ───────────────────────────────────────────────────────────────────────
// New pattern: react-router-dom
//
//   <BrowserRouter>  — wraps the whole app and enables client-side routing
//                      using the browser's History API (real URLs, no #hash).
//
//   <Routes>         — looks at the current URL and renders the first <Route>
//                      whose path matches.
//
//   <Route path="/" element={<ProductList />} />
//                    — renders ProductList when the URL is exactly "/".
//
//   <Route path="/products/:id" element={<ProductDetail />} />
//                    — ":id" is a *URL parameter*; react-router captures
//                      whatever is in that segment and makes it available via
//                      useParams() inside ProductDetail.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"             element={<ProductList />}   />
        <Route path="/products/:id" element={<ProductDetail />} />
      </Routes>
    </BrowserRouter>
  );
}
