const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");

// sql.js is a pure-JS / WebAssembly build of SQLite — no C++ compiler needed.
// Downside: it keeps the entire DB in memory and flushes to disk manually.
// For a small dev project this is perfectly fine; swap for better-sqlite3
// (requires Visual Studio Build Tools on Windows) when you need production perf.

const DB_PATH = path.join(__dirname, "data", "store.db");

// sql.js must be initialised asynchronously (it loads a WASM binary).
// We export a promise so index.js can await it before starting the server.
const dbPromise = initSqlJs().then((SQL) => {
  // If a .db file already exists on disk, load it; otherwise start fresh.
  const fileBuffer = fs.existsSync(DB_PATH) ? fs.readFileSync(DB_PATH) : null;
  const db = fileBuffer ? new SQL.Database(fileBuffer) : new SQL.Database();

  // ── Schema migration ──────────────────────────────────────────────────────
  // CREATE TABLE only creates the table when it doesn't exist yet, so this is
  // safe to re-run on every server start.
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      price       REAL    NOT NULL,
      description TEXT    NOT NULL DEFAULT '',
      image_url   TEXT    NOT NULL DEFAULT ''
    );
  `);

  // ALTER TABLE … ADD COLUMN is the standard way to add a column to an
  // existing table in SQLite. It fails silently if the column is already
  // there (we wrap each in a try/catch so existing DBs aren't broken).
  const addColumnIfMissing = (col, type, defaultVal) => {
    try {
      db.run(`ALTER TABLE products ADD COLUMN ${col} ${type} NOT NULL DEFAULT '${defaultVal}';`);
    } catch (_) {
      // Column already exists — ignore
    }
  };
  addColumnIfMissing("description", "TEXT", "");
  addColumnIfMissing("image_url",   "TEXT", "");

  // ── Seed data ─────────────────────────────────────────────────────────────
  // Only seed when the table is empty so we don't duplicate rows on restart.
  const isEmpty = db.exec("SELECT COUNT(*) AS n FROM products;")[0].values[0][0] === 0;
  if (isEmpty) {
    // Using picsum.photos for deterministic placeholder images.
    // Each URL resolves to a fixed, themed photo (seed= makes it stable).
    const products = [
      {
        name: "Classic White Tee",
        price: 29.99,
        description: "A timeless 100% organic cotton crew-neck tee. Relaxed fit, pre-shrunk, available in S–XXL.",
        image_url: "https://picsum.photos/seed/tee-white/600/700",
      },
      {
        name: "Slim Fit Chinos",
        price: 59.99,
        description: "Tapered slim-fit chinos in stretch twill. Perfect for smart-casual looks.",
        image_url: "https://picsum.photos/seed/chinos/600/700",
      },
      {
        name: "Leather Bomber Jacket",
        price: 149.99,
        description: "Genuine full-grain leather bomber with ribbed cuffs and a YKK zip. A wardrobe staple.",
        image_url: "https://picsum.photos/seed/bomber/600/700",
      },
      {
        name: "Floral Midi Dress",
        price: 79.99,
        description: "Lightweight viscose midi dress with an all-over floral print. Fully lined, back zip.",
        image_url: "https://picsum.photos/seed/floraldress/600/700",
      },
      {
        name: "Knit Beanie",
        price: 19.99,
        description: "Super-soft merino wool beanie with a cuffed edge. One size fits most.",
        image_url: "https://picsum.photos/seed/beanie/600/700",
      },
      {
        name: "Running Sneakers",
        price: 89.99,
        description: "Lightweight mesh sneakers with a cushioned EVA sole. Breathable, gender-neutral design.",
        image_url: "https://picsum.photos/seed/sneakers/600/700",
      },
      {
        name: "Oversized Hoodie",
        price: 64.99,
        description: "Brushed fleece oversized hoodie with a kangaroo pocket and adjustable drawcord.",
        image_url: "https://picsum.photos/seed/hoodie/600/700",
      },
      {
        name: "Tailored Blazer",
        price: 119.99,
        description: "Single-breasted slim blazer in stretch ponte fabric. Works as a suit or separate.",
        image_url: "https://picsum.photos/seed/blazer/600/700",
      },
    ];

    // sql.js uses prepared statements the same way SQLite does.
    const stmt = db.prepare(
      "INSERT INTO products (name, price, description, image_url) VALUES (?, ?, ?, ?)"
    );
    products.forEach(({ name, price, description, image_url }) => {
      stmt.run([name, price, description, image_url]);
    });
    stmt.free(); // always free prepared statements when done
  }

  // ── Persist helper ────────────────────────────────────────────────────────
  // Call this after every write so changes survive server restarts.
  db.persist = () => {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  };

  // Save initial state (creates / updates the file on disk).
  db.persist();

  return db;
});

module.exports = dbPromise;
