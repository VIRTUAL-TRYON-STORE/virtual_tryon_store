import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// vite.config.js tells Vite to use the React plugin (JSX transform + Fast Refresh).
// The proxy block forwards any /api/* request from the React dev server
// to the Express server so you never hit CORS issues during development.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:5000",
    },
  },
});
