# MMGH Data Management - Backend + Deploy

This workspace contains the `hospital-management.html` frontend and a minimal Node.js/Express backend that can persist data to PostgreSQL.

Quick overview:

- `server.js` — Express server with `/api/data` (GET) and `/api/bulk` (POST) endpoints
- `db.js` — Postgres helper
- `sql/init.sql` — SQL schema to create tables
- `hospital-management.html` — frontend (updated to use API when available)

Local run

1. Copy `.env.example` to `.env` and set `DATABASE_URL`.
2. Install dependencies:

```bash
npm install
```

3. Ensure Postgres is running and initialize schema:

```bash
psql $DATABASE_URL -f sql/init.sql
```

4. Start server:

```bash
npm start
```

Production (Render)

- Push this repository to GitHub.
- Create a new Web Service on Render, connect the repo.
- In Render service settings, set the `DATABASE_URL` environment variable to the managed Postgres connection string.
- Render will detect `node` and run `npm start`.

Notes

- The `POST /api/bulk` endpoint will truncate and replace tables — this is a simple import mechanism used by the frontend's save routine when a server is available. For production use, implement per-resource CRUD and safer merging/upserts.
- After deployment, create the database (Render UI provides managed Postgres) and run `sql/init.sql` once.

If you want, I can:

- Implement full per-resource CRUD and update the frontend to call each endpoint.
- Add migrations and safer upsert logic.
- Create a GitHub Actions workflow for CI.
