# Virtual Try-On Store

A monorepo scaffold for a virtual try-on e-commerce app built with React (Vite), Node.js + Express, and SQLite (via **sql.js** — a pure-JS/WASM SQLite driver that requires no C++ compiler).

---

## Folder Structure

```
virtual_tryon/              ← project root
├── client/                 ← React frontend (Vite)
│   ├── src/
│   │   ├── App.jsx         ← root component
│   │   ├── main.jsx        ← ReactDOM entry point
│   │   └── index.css       ← global styles
│   ├── index.html          ← Vite HTML shell
│   ├── vite.config.js      ← Vite + React plugin config; dev-proxy to /api
│   └── package.json
│
├── server/                 ← Express backend
│   ├── data/               ← SQLite .db file lives here (git-ignored)
│   ├── db.js               ← opens DB, creates tables on first run
│   ├── index.js            ← Express app, CORS, routes
│   └── package.json
│
├── .gitignore              ← excludes node_modules, .env, *.db
└── README.md               ← this file
```

---

## What Each Part Does

| Part | Purpose |
|------|---------|
| `client/` | React UI served by Vite's dev server on **port 5173**. Any request to `/api/*` is proxied to the Express server so no CORS issues occur in development. |
| `server/` | Express REST API on **port 5000**. Reads/writes a local SQLite database via `better-sqlite3`. |
| `server/data/store.db` | Auto-created by `db.js` when the server first starts. Excluded from git. |

---

## Running Locally

### 1 — Install dependencies (first time only)

```bash
# In /server
cd server
npm install

# In /client
cd ../client
npm install
```

### 2 — Start the backend

```bash
cd server
npm run dev        # uses nodemon for auto-reload on save
```

The API will be available at `http://localhost:5000`.

### 3 — Start the frontend

Open a **second terminal**:

```bash
cd client
npm run dev        # Vite dev server with HMR
```

The React app will be available at `http://localhost:5173`.

### 4 — Test the placeholder route

```bash
curl http://localhost:5000/api/products
# → []
```

---

## Next Steps (not built yet)

- Product listing page
- Shopping cart
- Virtual try-on feature
- User authentication
