# JurisDoc — Brazilian Law Firm Document Management SaaS

## Overview

Full-stack Brazilian law firm SaaS MVP with Replit Auth, document management (PDF/DOCX), full-text search, Gemini AI document chat, and admin panel. All UI text in Brazilian Portuguese (pt-BR). pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui
- **Auth**: Replit OIDC Auth
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

- `sessions` + `users` — Replit Auth (OIDC sessions, user profiles)
- `app_users` — App-specific user table with `role` enum (`admin` | `advogado`), references `users.id` via `replit_user_id`
- `documents` — Uploaded documents with title, fileName, storagePath, mimeType, extractedText, GIN full-text search index using Portuguese config

First user to log in is auto-created as admin.

## Security Architecture

### Middleware Pipeline
1. `authMiddleware` — OIDC session validation + token refresh
2. `appUserMiddleware` — auto-provisions `app_users` row on every authenticated request (first user = admin)
3. `activeUserGuard` — blocks deactivated users from all protected routes (returns 403)

### Access Control
- Storage object retrieval verifies document exists in DB before serving files (prevents IDOR)
- Document delete requires ownership or admin role
- Admin routes (user CRUD) require `role === "admin"`

## API Routes (all prefixed `/api`)

- `GET /api/healthz` — Health check
- Auth routes — `/api/auth/*` (Replit OIDC)
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

- `/login` — Login page with Replit Auth
- `/` — Dashboard (document list + search + upload modal)
- `/document/:id` — Document detail with PDF viewer + AI chat panel
- `/admin` — Admin user management panel (admin role only)

## Document Upload Flow

1. Client sends file via multipart POST to `/api/storage/upload-document`
2. Server stores file to object storage (GCS)
3. Server extracts text using pdf-parse (PDF) or mammoth (DOCX)
4. Server creates document record atomically with extracted text

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
