# Jurisdoc — Guia de desenvolvimento

Este repositório contém a API (Express + Drizzle), o front‑end React/Vite e as libs compartilhadas usadas pelo Jurisdoc. Abaixo estão os passos para rodar localmente e o fluxo recomendado para publicar no Render.

## Pré‑requisitos

- Node.js 20+
- PNPM 9 (o projeto usa workspaces e `pnpm-lock.yaml`)
- Banco PostgreSQL (local ou remoto)
- Variáveis `.env` configuradas (use `.env.example` como base)

## Setup inicial

1. Instale dependências em todo o monorepo:

   ```bash
   pnpm install
   ```

2. Prepare o arquivo `.env` na raiz com as chaves de banco, R2 e APIs. Exemplo:

   ```bash
   cp .env.example .env
   # depois edite com seus valores reais
   ```

## Rodando localmente

Abra dois terminais:

1. **API**

   ```bash
   pnpm dev:api
   ```

   O servidor sobe em `http://localhost:8080` (com rotas `/api/*`). Ele já serve o build do front caso você execute `pnpm --filter @workspace/web build` antes.

2. **Front‑end**

   ```bash
   pnpm dev:web
   ```

   O Vite fica em `http://localhost:5173` e proxia `/api` para `8080`. Faça login/testes por essa porta durante o desenvolvimento.

3. **Testes/Typecheck** (opcional, mas recomendado antes do deploy):

   ```bash
   pnpm run typecheck
   ```

## Deploy no Render (produção)

1. Valide o Dockerfile localmente:

   ```bash
   docker build -t jurisdoc .
   docker run --rm -p 8080:8080 jurisdoc
   ```

2. Commit/push na branch `master` (o Render acompanha essa branch).

3. No painel do Render clique em **Deploy latest commit**. O fluxo usa o Dockerfile para gerar uma imagem contendo:
   - Stage `deps`: `pnpm install --frozen-lockfile`
   - Stage `builder`: `pnpm run build:production`
   - Stage final: reaproveita `node_modules` do stage `deps`, copia os `dist/` e roda `node artifacts/api-server/dist/index.cjs`

4. Configure no Render as mesmas variáveis de ambiente do `.env`.

## Troubleshooting rápido

- **404 ao abrir PDFs** → confirme que o backend está rodando (porta 8080) e que a URL usada no front aponta para `/api/storage/objects/*` com autenticação válida.
- **Warn “tooltip sourcemap”** → já desativamos sourcemaps e o plugin de overlay em produção; se reativar, rode `pnpm dev:web` para reproduzir e ajustar.
- **`Missing parameter name at index`** → acontece quando o fallback do Express usa `"*"`; o código atual usa regex `^/(?!api).*` e resolve o problema.
