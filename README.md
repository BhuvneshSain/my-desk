# My Desk

An installable, offline‑friendly React + Vite dashboard for day‑to‑day office work. It includes attendance tracking, tasks, inward/outward registers, a simple profile, and CSV/Excel exports — all stored locally by default.

## Features

- Attendance
  - Month view calendar with weekend auto‑leave, Today button, and status legend.
  - Joining date from Profile is used as the earliest date.
  - Per‑day status (Present/Leave/Travel…) with monthly summary and Excel export.

- Tasks
  - Create/Edit/Delete with required validation (Title, Due Date).
  - Quick filters: All, Overdue, Today, Upcoming, Done.
  - Sortable columns (Title, Priority, Status, Due Date) + inline “Mark Done”.
  - Optional link to an Inward document; export to Excel.

- Inward/Outward Register
  - File No, Office (dropdown with Manage Offices), Subject, Note.
  - Modern file upload (PDF/images) with validation (type + max 20 MB).
  - Duplicate File No guard; search; export to Excel.
  - Manage Offices modal de‑duplicates and sorts entries.

- Profile
  - Photo upload/preview; Name; Post (default: Programmer); Department; Posting Place; Joining Date; Contact No; Email; DOB.
  - Save + Reset with success toasts. Avatar updates live in the header.

- Notifications & UX
  - Header bell shows count for tasks due today; dropdown closes on outside click/Esc.
  - Accessible buttons (aria‑labels), consistent toasts, mobile‑friendly layout.

- PWA (Installable)
  - Manifest + service worker for basic offline caching. Works as a standalone app once visited.

## Getting Started

Prerequisites: Node.js 18+

Install dependencies:

```bash
npm install
```

Run in development (HMR):

```bash
npm run dev
```

Build for production and preview locally:

```bash
npm run build
npm run preview
```

## Deploying

This is a static SPA — deploy the `dist/` folder to any static host (Cloudflare Pages, Netlify, Vercel, GitHub Pages).

- SPA routing: ensure requests fall back to `index.html`.
  - Netlify: add `public/_redirects` with `/* /index.html 200`.
  - Vercel: add a `vercel.json` rewrite to `/`.
  - Cloudflare Pages: SPA fallback is automatic.

## Storage Model

By default all data is stored locally in the browser (single‑user):

- localStorage keys (see `src/utils/localStorage.js`):
  - `myDesk_attendance`, `myDesk_tasks`, `myDesk_inward`, `myDesk_outward`,
    `myDesk_offices`, `myDesk_profile`, plus optional modules.
- Attachments are currently stored as base64 in the register records for simplicity.

Limits and recommendations:

- Browsers typically allow ~5–10 MB for localStorage. Base64 inflates files by ~33%.
- For larger/long‑term use:
  - Move attachments to a free cloud option (e.g., Google Drive via the Drive API) and store only file ids/links.
  - Or store attachments in IndexedDB (via localForage) and keep metadata in localStorage.

## Configuration

- Tailwind is configured in `tailwind.config.js` (brand color: `#4C51BF`).
- PWA files: `public/manifest.webmanifest` and `public/sw.js` (network‑first caching).

## Roadmap / Ideas

- Drive backup/restore for metadata; store attachments in Drive with public/signed links.
- Global search (header) across tasks and registers.
- Optional delete for Inward/Outward items with confirm/undo.
- More calendar keyboard navigation and ARIA improvements.

## Notes

- This project started from Vite’s React template and was extended with custom pages and components.
- No backend is required; adding one later (Supabase/Firebase) is straightforward if you outgrow local limits.
