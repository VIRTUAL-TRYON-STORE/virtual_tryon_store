const express = require("express");
const cors = require("cors");
const dbPromise = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Bootstrap: wait for the DB to be ready, then start listening ─────────────
// sql.js loads a WASM file asynchronously, so we await it before accepting
// requests — otherwise the first request might arrive before the DB is ready.
dbPromise.then((db) => {
  // ── Helper: turn sql.js exec() result into an array of plain objects ──────
  // sql.js's exec() returns: []  (no rows)  OR  [{ columns, values }]
  // This helper normalises that into the same shape as better-sqlite3's .all()
  const rowsFrom = (result) =>
    result.length > 0
      ? result[0].values.map((row) =>
          Object.fromEntries(result[0].columns.map((col, i) => [col, row[i]]))
        )
      : [];

  // ── Routes ─────────────────────────────────────────────────────────────────

  // GET /api/products  — returns all products
  app.get("/api/products", (req, res) => {
    const result = db.exec("SELECT * FROM products ORDER BY id;");
    res.json(rowsFrom(result));
  });

  // GET /api/products/:id  — returns a single product by id
  // ":id" is a *route parameter* — Express captures whatever is in that URL
  // segment and exposes it as req.params.id (always a string, so we cast it).
  app.get("/api/products/:id", (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: "id must be a positive integer" });
    }

    // Use a prepared statement with a ? placeholder to prevent SQL injection.
    const stmt = db.prepare("SELECT * FROM products WHERE id = ?;");
    stmt.bind([id]);
    const row = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();

    if (!row) {
      return res.status(404).json({ error: `Product ${id} not found` });
    }
    res.json(row);
  });

  // ── Start ───────────────────────────────────────────────────────────────────
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
