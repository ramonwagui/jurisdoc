# JurisDoc — Brazilian Law Firm Document Management SaaS

## Overview

Full-stack Brazilian law firm SaaS MVP with email/password database authentication, document management (PDF/DOCX), full-text search, Gemini AI document chat, and admin panel. All UI text in Brazilian Portuguese (pt-BR). pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui
- **Auth**: Email + password (bcryptjs), DB session cookies (`sessions` table)
- **AI**: Gemini 2.5 Flash (via Replit AI Integrations)
- **Storage**: Replit Object Storage (GCS)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Server-side extraction**: pdf-parse (PDF), mammoth (DOCX)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/            # Express API server (port 8080)
│   └── web/                   # React + Vite frontend
├── lib/
│   ├── api-spec/              # OpenAPI spec + Orval codegen config
│   ├── api-client-react/      # Generated React Query hooks
│   ├── api-zod/               # Generated Zod schemas from OpenAPI
│   ├── db/                    # Drizzle ORM schema + DB connection
│   ├── replit-auth/           # Replit Auth server middleware
│   ├── replit-auth-web/       # Replit Auth React client hook
│   ├── object-storage/        # Object storage server routes
│   ├── object-storage-web/    # Object storage React client
│   └── integrations-gemini-ai/# Gemini AI client
├── scripts/                   # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

## Database Schema

- `sessions` — DB session store (sid, sess JSON with `{appUserId}`, expire)
- `users` — Kept for legacy Replit Auth compatibility (not used for new auth)
- `app_users` — Core user table: `id`, `name`, `email` (unique), `password_hash`, `role` enum (`admin`|`advogado`), `active`, `created_at`
- `documents` — Uploaded documents with title, fileName, storagePath, mimeType, extractedText, GIN full-text search index using Portuguese config

First admin is created via the Setup page on first visit (shows when no password-based user exists).

## Auth Architecture

### Login Flow
- `POST /api/auth/login` → email + bcrypt password check → create session cookie (`sid`)
- Session stored in `sessions` table as `{ appUserId: number }`
- `GET /api/auth/user` → loads appUser from session → returns safe user object (no passwordHash)

### First-Time Setup
- `GET /api/auth/setup-status` → `{ needsSetup: boolean }` (true = no password user exists)
- `POST /api/auth/setup` → creates first admin (only works when needsSetup=true)
- Login page auto-detects setup state and shows the correct form

### Middleware Pipeline
1. `authMiddleware` — reads session cookie → loads `appUser` from DB → sets `req.appUser`
2. `activeUserGuard` — blocks deactivated users from all protected routes (returns 403)

### Access Control
- Storage object retrieval verifies document exists in DB before serving files (prevents IDOR)
- Document delete requires ownership or admin role
- Admin routes (user CRUD) require `role === "admin"`

## API Routes (all prefixed `/api`)

- `GET /api/healthz` — Health check
- `GET /api/auth/setup-status` — Check if first admin needs to be created
- `POST /api/auth/setup` — Create first admin (only when no password users exist)
- `POST /api/auth/login` — Email + password login
- `GET /api/auth/user` — Get current authenticated user
- `GET /api/logout` — Clear session and redirect to /login
- `POST /api/storage/upload-document` — Server-side multipart upload with text extraction
- `GET /api/storage/objects/*` — Serve stored files (auth + document ownership check)
- `GET /api/users/me` — Current user profile
- `GET /api/users` — List all users (admin only)
- `POST /api/users` — Create user (admin only)
- `PATCH /api/users/:id` — Update user (admin only)
- `GET /api/documents` — List documents (paginated)
- `GET /api/documents/search?q=...` — Full-text search (dual portuguese+simple tsquery, ILIKE fallback)
- `GET /api/documents/:id` — Get document detail
- `DELETE /api/documents/:id` — Delete document (owner or admin)
- `POST /api/documents/:id/chat` — SSE stream AI chat with document

## Frontend Pages

- `/login` — Login page with email/password form; auto-detects first-setup mode
- `/` — Dashboard (document list + search + upload modal)
- `/document/:id` — Document detail with PDF viewer + AI chat panel
- `/admin` — Admin user management panel (admin role only)

## Document Upload Flow

1. Client sends file via multipart POST to `/api/storage/upload-document`
2. Server stores file to object storage (GCS)
3. Server extracts text using pdf-parse (PDF) or mammoth (DOCX)
4. Server creates document record atomically with extracted text

## Design System

- **Theme**: Light professional theme — white/off-white backgrounds, deep navy blue primary (#1E3A5F range via HSL)
- **Fonts**: Inter (body/sans-serif) + Instrument Serif (headings/display) via Google Fonts
- **CSS variables**: All colors defined as HSL CSS custom properties in `:root` within `index.css`
- **Brand accent**: Gold gradient preserved only for logo icon and AI bot avatar (brand-gradient-bg / brand-gradient-text utilities)
- **Components**: Button, Input, Card in `ui-components.tsx` — use semantic color classes (text-foreground, text-muted-foreground, bg-card, etc.)
- **No dark theme**: Single light theme only

## Key Design Decisions

- `app_users.id` (serial int) is used as FK for documents, separate from auth `users.id` (varchar UUID)
- Gemini chat maps DB `assistant` role to API `model` role
- SSE chat uses POST + ReadableStream (not EventSource) since body is required
- CORS locked to Replit domains only
- Dual-dictionary full-text search (portuguese + simple) with GIN index; ILIKE fallback when tsvector returns 0 results
- HTTP request logging via morgan (dev mode only)
- Server-side text extraction ensures integrity (client cannot tamper with extracted text)

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — `pnpm run typecheck`
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly`

## Codegen

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

## Database Commands

- `pnpm --filter @workspace/db run push` — sync schema to DB
- `pnpm --filter @workspace/db run push-force` — force sync (fallback)
