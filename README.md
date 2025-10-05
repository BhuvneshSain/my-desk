# My-Desk

A full-stack office management suite combining a React (Vite) frontend with a PostgreSQL + Prisma powered Express API. Phase 0 establishes the new backend foundation; existing SPA features remain in place while the data layer migrates from local storage to the centralized API across later phases.

## Features (current frontend)

- **Attendance**: Calendar view with status legend, joining-date limits, per-day status editing, monthly summary, and Excel export.
- **Tasks**: Create/edit/delete with validation, quick filters (All/Overdue/Today/Upcoming/Done), sortable columns, inline “Mark Done”, optional document links, and Excel export.
- **Inward/Outward Register**: File number tracking, office dropdown with de-duplication, subject/note fields, attachment upload (PDF/images, max 20 MB) with duplicate guards, searching, and exports.
- **Profile**: Photo upload/preview plus key employee fields with live avatar updates and reset option.
- **Notifications & UX**: Due-today task count in header bell, accessible controls, responsive layout, consistent toasts.
- **PWA**: Installable manifest + service worker for offline-friendly usage.

## Monorepo Layout

- `src/`, `public/`, etc. – React + Vite frontend (existing app).
- `backend/` – New Express + Prisma API project (TypeScript).
- `server/` – Legacy file-based API (will be superseded in later phases).
- `profile/` – Local JSON/data placeholders from the original implementation.

## Quick Start

### Frontend

```bash
npm install
npm run dev
```

The Vite dev server proxies `/api/*` requests to `http://localhost:4000` (configurable via `VITE_PROXY_TARGET`).

### Backend (Phase 0 foundation)

```bash
cd backend
npm install
cp .env.example .env        # update DATABASE_URL + JWT_SECRET
npm run prisma:generate
npm run prisma:migrate      # creates tables defined in prisma/schema.prisma
npm run dev                 # starts Express on PORT (default 4000)
```

> PostgreSQL 14+ is required. The initial migration creates the Employee, Attendance, Task, TaskAssignment, and Document tables plus supporting enums.

## Deploying

- **Frontend**: `npm run build` followed by serving the generated `dist/` folder on any static host (Cloudflare Pages, Netlify, Vercel, GitHub Pages). Ensure SPA routing rewrites to `index.html`.
- **Backend**: Build with `npm run build` in `backend/` and deploy the Node server alongside a managed PostgreSQL instance. Run `npm run prisma:deploy` during rollout to apply migrations.

## Configuration Highlights

- Tailwind config lives in `tailwind.config.js` (primary color `#4C51BF`).
- PWA manifest/service worker reside in `public/`.
- Backend environment template: `backend/.env.example`.
- Prisma schema + migrations: `backend/prisma/`.

## Roadmap

Phase-based migration plan toward a fully multi-user platform:

1. **Phase 0 (done here)** – Backend scaffolding + data modeling (Prisma schema & migrations) and Vite proxy setup.
2. **Phase 1** – JWT authentication, employee CRUD & protected routes on both API and UI.
3. **Phase 2** – Task management APIs and Kanban UI with drag-and-drop + multi-assignment.
4. **Phase 3** – Attendance check-in/out API, dashboard controls, and document registry backed by PostgreSQL.
5. **Phase 4** – Reporting endpoints, dashboard metrics, and export tooling.

## Notes

- Existing local-storage logic remains operational until the frontend transitions to API-backed data sources in subsequent phases.
- Legacy assets (e.g., `server/index.js`, `profile/`) are preserved for reference/debugging during the migration.
- When altering Prisma models, run `npm run prisma:generate` before compiling the backend to refresh the typed client.
