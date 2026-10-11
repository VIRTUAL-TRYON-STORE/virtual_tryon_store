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

  // ── POST /api/orders ─────────────────────────────────────────────────────
  // Creates a new order from the cart contents.
  //
  // NEW PATTERN — Database Transaction:
  //   A transaction is a group of SQL statements that either ALL succeed or
  //   ALL fail together. Imagine writing the order row succeeds but then the
  //   server crashes halfway through writing the items — you'd have a "ghost"
  //   order with no items. Wrapping both writes in a transaction means SQLite
  //   won't save ANY of them unless every single statement succeeds.
  //
  //   sql.js exposes this through db.run("BEGIN"), db.run("COMMIT"), and
  //   db.run("ROLLBACK"). We call ROLLBACK inside a catch block so that any
  //   error automatically undoes all changes made so far in that transaction.
  //
  app.post("/api/orders", (req, res) => {
    const { name, email, address, items } = req.body;

    // ── Input validation ────────────────────────────────────────────────────
    if (!name || !name.trim())    return res.status(400).json({ error: "Name is required." });
    if (!email || !email.trim())  return res.status(400).json({ error: "Email is required." });
    if (!address || !address.trim()) return res.status(400).json({ error: "Address is required." });
    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ error: "Order must contain at least one item." });

    for (const item of items) {
      if (!Number.isInteger(item.productId) || item.productId < 1)
        return res.status(400).json({ error: `Invalid productId: ${item.productId}` });
      if (!Number.isInteger(item.quantity) || item.quantity < 1)
        return res.status(400).json({ error: `Quantity for product ${item.productId} must be a whole number ≥ 1.` });
    }

    // ── Look up prices from the DB (never trust browser prices) ────────────
    const enriched = [];
    for (const item of items) {
      const stmt = db.prepare("SELECT id, price FROM products WHERE id = ?;");
      stmt.bind([item.productId]);
      const product = stmt.step() ? stmt.getAsObject() : null;
      stmt.free();

      if (!product) {
        return res.status(400).json({ error: `Product ${item.productId} does not exist.` });
      }
      enriched.push({ productId: item.productId, quantity: item.quantity, unitPrice: product.price });
    }

    const total = enriched.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

    // ── Write order + items inside ONE transaction ──────────────────────────
    // If anything throws between BEGIN and COMMIT, the catch runs ROLLBACK,
    // reverting every change made in this transaction.
    try {
      db.run("BEGIN;");

      // Insert the parent order row.
      db.run(
        "INSERT INTO orders (customer_name, customer_email, address, total) VALUES (?, ?, ?, ?);",
        [name.trim(), email.trim(), address.trim(), total]
      );

      // sql.js: retrieve the id of the last inserted row.
      const orderId = db.exec("SELECT last_insert_rowid() AS id;")[0].values[0][0];

      // Insert one row per item.
      const itemStmt = db.prepare(
        "INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?);"
      );
      for (const i of enriched) {
        itemStmt.run([orderId, i.productId, i.quantity, i.unitPrice]);
      }
      itemStmt.free();

      db.run("COMMIT;");
      db.persist(); // flush in-memory DB to disk

      res.status(201).json({ orderId });
    } catch (err) {
      db.run("ROLLBACK;");
      console.error("Order transaction failed:", err);
      res.status(500).json({ error: "Could not save order. Please try again." });
    }
  });

  // ── GET /api/orders/:id ──────────────────────────────────────────────────
  // Returns the order with its items (including each product's name).
  app.get("/api/orders/:id", (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: "id must be a positive integer" });
    }

    // Fetch the order header row.
    const orderStmt = db.prepare("SELECT * FROM orders WHERE id = ?;");
    orderStmt.bind([id]);
    const order = orderStmt.step() ? orderStmt.getAsObject() : null;
    orderStmt.free();

    if (!order) {
      return res.status(404).json({ error: `Order ${id} not found.` });
    }

    // Fetch items joined with product name.
    const itemsResult = db.exec(`
      SELECT oi.id, oi.product_id, oi.quantity, oi.unit_price, p.name AS product_name
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ?;
    `, [id]);

    const itemRows = itemsResult.length > 0
      ? itemsResult[0].values.map((row) =>
          Object.fromEntries(itemsResult[0].columns.map((col, i) => [col, row[i]]))
        )
      : [];

    res.json({ ...order, items: itemRows });
  });

  // ── Start ───────────────────────────────────────────────────────────────────
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
