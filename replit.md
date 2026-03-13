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
- **Storage**: Replit Object Storage (GCS presigned URLs)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

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

## API Routes (all prefixed `/api`)

- `GET /api/healthz` — Health check
- Auth routes — `/api/auth/*` (Replit OIDC)
- Storage routes — `/api/storage/*` (object upload/download)
- `GET /api/users/me` — Current user profile (auto-creates on first login)
- `GET /api/users` — List all users (admin only)
- `POST /api/users` — Create user (admin only)
- `PATCH /api/users/:id` — Update user (admin only)
- `GET /api/documents` — List documents (paginated)
- `POST /api/documents` — Create document record
- `GET /api/documents/search?q=...` — Full-text search (Portuguese tsquery)
- `GET /api/documents/:id` — Get document detail
- `DELETE /api/documents/:id` — Delete document
- `POST /api/documents/:id/chat` — SSE stream AI chat with document

## Frontend Pages

- `/login` — Login page with Replit Auth
- `/` — Dashboard (document list + search + upload modal)
- `/document/:id` — Document detail with PDF viewer + AI chat panel
- `/admin` — Admin user management panel (admin role only)

## Document Upload Flow

1. Client extracts text from PDF (pdf.js) or DOCX (mammoth) in browser
2. Client requests presigned URL via `POST /api/storage/upload-url`
3. Client uploads file directly to GCS via PUT
4. Client creates document record via `POST /api/documents` with extracted text

## Key Design Decisions

- `app_users.id` (serial int) is used as FK for documents, separate from auth `users.id` (varchar UUID)
- Gemini chat maps DB `assistant` role to API `model` role
- SSE chat uses POST + ReadableStream (not EventSource) since body is required
- CORS locked to Replit domains only
- Portuguese full-text search with GIN index for fast lookups

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
