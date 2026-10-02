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

  // Create the products table if it doesn't exist yet.
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      name  TEXT    NOT NULL,
      price REAL    NOT NULL
    );
  `);

  // Persist the DB to disk immediately after each write.
  // Call this helper after every INSERT / UPDATE / DELETE.
  db.persist = () => {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  };

  // Save initial state (creates the file on disk).
  db.persist();

  return db;
});

module.exports = dbPromise;
