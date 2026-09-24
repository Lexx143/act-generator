# act-generator — technical inspection report generator

[![CI](https://github.com/Lexx143/act-generator/actions/workflows/ci.yml/badge.svg)](https://github.com/Lexx143/act-generator/actions/workflows/ci.yml)

[Русский](README.md) · **English**

Internal web application for IT Support Group LLP: a field engineer logs in, fills out a form and gets a ready-to-print inspection report on the company letterhead (with the corporate seal and signature) for saving as PDF. Every report is stored in the database with a full audit trail: who created it, when, and for which client.

## Stack

Next.js 16 (App Router) · Tailwind CSS 4 + shadcn/ui · SQLite (better-sqlite3) · JWT sessions (jose) + bcryptjs. PDF is produced from the print-perfect HTML letterhead via `window.print()` (Cmd/Ctrl+P → "Save as PDF").

## Features

- Authentication with roles: **specialist** (creates reports, sees only their own) and **admin** (sees everything, manages employees).
- Report form: auto-suggested number, date, client, equipment table, defect description, conclusion (with a one-click template).
- Pixel-faithful letterhead: logo, seal and signature images live in `public/letterhead/` and are easily replaceable.
- History: search, filters by employee and period, precise creation timestamp; edits are tracked via `updated_at`.
- Employee management: add, edit, reset password, deactivate; deletion is allowed only for users without reports so the audit trail is never lost.
- Each employee has two name fields: a regular one (UI) and a declined one used inside the report text (Russian instrumental case).

## Local development

```bash
npm install
npm run dev
```

On first start the app creates `data/acts.db` and an `admin` user — the password is printed to the console (or set `INITIAL_ADMIN_PASSWORD`).

## Deployment

The server needs Docker and a reverse proxy (e.g. Caddy) routing to `172.17.0.1:3001`. Put the server credentials into `.deploy.env` (see `.deploy.env.example`), then:

```bash
./deploy.sh
```

The project directory on the server must contain an `.env` with `SESSION_SECRET` (generate with `openssl rand -hex 32`), optionally `INITIAL_ADMIN_PASSWORD`. The database lives in `data/` (a volume) and survives rebuilds. Backups: `./backup_db.sh` (cron-friendly).

## Letterhead

See `components/ActLetterhead.tsx`. Images in `public/letterhead/`: `logo.png`, `seal.png`, `signature.png`. To replace them, just overwrite the PNGs (transparent background) and redeploy: `./deploy.sh`.
