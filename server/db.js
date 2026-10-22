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
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      name            TEXT    NOT NULL,
      price           REAL    NOT NULL,
      description     TEXT    NOT NULL DEFAULT '',
      image_url       TEXT    NOT NULL DEFAULT '',
      tryon_image_url TEXT,
      category        TEXT
    );
  `);

  // ── Orders tables ─────────────────────────────────────────────────────────
  // orders holds one row per completed checkout. customer_* fields come from
  // the form; total is calculated server-side (never trusted from the browser).
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name  TEXT    NOT NULL,
      customer_email TEXT    NOT NULL,
      address        TEXT    NOT NULL,
      total          REAL    NOT NULL,
      created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // order_items links each order to its products. unit_price is snapshotted
  // at order time so a future price change doesn't alter historical orders.
  db.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id   INTEGER NOT NULL REFERENCES orders(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity   INTEGER NOT NULL,
      unit_price REAL    NOT NULL
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

  // ── tryon_image_url & category migration ──────────────────────────────────
  // Check with PRAGMA table_info(products) and run ALTER TABLE only if missing.
  const tableInfoResult = db.exec("PRAGMA table_info(products);");
  const existingCols = tableInfoResult.length > 0
    ? tableInfoResult[0].values.map((row) => row[1])
    : [];
  if (!existingCols.includes("tryon_image_url")) {
    db.run("ALTER TABLE products ADD COLUMN tryon_image_url TEXT;");
  }
  if (!existingCols.includes("category")) {
    db.run("ALTER TABLE products ADD COLUMN category TEXT;");
  }

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
        image_url: "/garments/tee.png",
        tryon_image_url: "/garments/tee.png",
        category: "Tops",
      },
      {
        name: "Slim Fit Chinos",
        price: 59.99,
        description: "Tapered slim-fit chinos in stretch twill. Perfect for smart-casual looks.",
        image_url: "https://picsum.photos/seed/chinos/600/700",
        tryon_image_url: null,
        category: "Bottoms",
      },
      {
        name: "Leather Bomber Jacket",
        price: 149.99,
        description: "Genuine full-grain leather bomber with ribbed cuffs and a YKK zip. A wardrobe staple.",
        image_url: "/garments/bomber.png",
        tryon_image_url: "/garments/bomber.png",
        category: "Outerwear",
      },
      {
        name: "Floral Midi Dress",
        price: 79.99,
        description: "Lightweight viscose midi dress with an all-over floral print. Fully lined, back zip.",
        image_url: "https://picsum.photos/seed/floraldress/600/700",
        tryon_image_url: null,
        category: "Dresses",
      },
      {
        name: "Knit Beanie",
        price: 19.99,
        description: "Super-soft merino wool beanie with a cuffed edge. One size fits most.",
        image_url: "https://picsum.photos/seed/beanie/600/700",
        tryon_image_url: null,
        category: "Accessories",
      },
      {
        name: "Running Sneakers",
        price: 89.99,
        description: "Lightweight mesh sneakers with a cushioned EVA sole. Breathable, gender-neutral design.",
        image_url: "https://picsum.photos/seed/sneakers/600/700",
        tryon_image_url: null,
        category: "Shoes",
      },
      {
        name: "Oversized Hoodie",
        price: 64.99,
        description: "Brushed fleece oversized hoodie with a kangaroo pocket and adjustable drawcord.",
        image_url: "/garments/hoodie.png",
        tryon_image_url: "/garments/hoodie.png",
        category: "Tops",
      },
      {
        name: "Tailored Blazer",
        price: 119.99,
        description: "Single-breasted slim blazer in stretch ponte fabric. Works as a suit or separate.",
        image_url: "/garments/blazer.png",
        tryon_image_url: "/garments/blazer.png",
        category: "Outerwear",
      },
    ];

    // sql.js uses prepared statements the same way SQLite does.
    const stmt = db.prepare(
      "INSERT INTO products (name, price, description, image_url, tryon_image_url, category) VALUES (?, ?, ?, ?, ?, ?)"
    );
    products.forEach(({ name, price, description, image_url, tryon_image_url, category }) => {
      stmt.run([name, price, description, image_url, tryon_image_url || null, category || null]);
    });
    stmt.free(); // always free prepared statements when done
  }

  // ── Idempotent update on startup ──────────────────────────────────────────
  // For the four try-on garments, ensure image_url and tryon_image_url are set
  // to their garment file. Matched by exact name and id from seed data.
  const tryonProducts = [
    { id: 1, name: "Classic White Tee", garment: "/garments/tee.png" },
    { id: 3, name: "Leather Bomber Jacket", garment: "/garments/bomber.png" },
    { id: 7, name: "Oversized Hoodie", garment: "/garments/hoodie.png" },
    { id: 8, name: "Tailored Blazer", garment: "/garments/blazer.png" },
  ];

  const updateStmt = db.prepare(
    "UPDATE products SET image_url = ?, tryon_image_url = ? WHERE name = ? OR id = ?;"
  );
  tryonProducts.forEach(({ id, name, garment }) => {
    updateStmt.run([garment, garment, name, id]);
  });
  updateStmt.free();

  // For products, ensure category is set. Matched by exact name and id from seed data.
  const categoryProducts = [
    { id: 1, name: "Classic White Tee", category: "Tops" },
    { id: 2, name: "Slim Fit Chinos", category: "Bottoms" },
    { id: 3, name: "Leather Bomber Jacket", category: "Outerwear" },
    { id: 4, name: "Floral Midi Dress", category: "Dresses" },
    { id: 5, name: "Knit Beanie", category: "Accessories" },
    { id: 6, name: "Running Sneakers", category: "Shoes" },
    { id: 7, name: "Oversized Hoodie", category: "Tops" },
    { id: 8, name: "Tailored Blazer", category: "Outerwear" },
  ];

  const catUpdateStmt = db.prepare(
    "UPDATE products SET category = ? WHERE name = ? OR id = ?;"
  );
  categoryProducts.forEach(({ id, name, category }) => {
    catUpdateStmt.run([category, name, id]);
  });
  catUpdateStmt.free();

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
