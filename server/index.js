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
  // ── Routes ─────────────────────────────────────────────────────────────────
  // sql.js uses .exec() (returns row arrays) instead of better-sqlite3's .all()
  app.get("/api/products", (req, res) => {
    const result = db.exec("SELECT * FROM products");
    // exec() returns [] when the table is empty, or [{columns, values}] otherwise.
    const rows =
      result.length > 0
        ? result[0].values.map((row) =>
            Object.fromEntries(result[0].columns.map((col, i) => [col, row[i]]))
          )
        : [];
    res.json(rows);
  });

  // ── Start ───────────────────────────────────────────────────────────────────
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
