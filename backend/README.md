# My-Desk Backend

TypeScript Express API backed by PostgreSQL and Prisma for the My-Desk office management suite.

## Prerequisites

- Node.js 18+
- PostgreSQL 14+ reachable via `DATABASE_URL`

## Setup

1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```
2. Copy the environment template and adjust values:
   ```bash
   cp .env.example .env
   ```
   - `DATABASE_URL` should point to your PostgreSQL instance (schema `public` by default).
   - `JWT_SECRET` can be any random string.
   - `CLIENT_ORIGIN` is a comma-separated list of front-end origins (defaults to Vite dev server).
3. Generate the Prisma client and run the initial migration:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```
   > The migration will create all tables defined in `prisma/schema.prisma`.

## Development

Start the API in watch mode:

```bash
npm run dev
```

The server listens on the port defined in `PORT` (defaults to `4000`) and exposes a basic `GET /healthz` endpoint until feature routes are implemented in later phases.

## Production build

```bash
npm run build
npm start
```

This compiles TypeScript to `dist/` and starts the compiled server.

## Prisma

- Schema lives in `prisma/schema.prisma`.
- Migrations are tracked under `prisma/migrations/`.
- Regenerate the client after altering the schema:
  ```bash
  npm run prisma:generate
  ```
