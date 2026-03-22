FROM node:20-slim AS base

WORKDIR /app

RUN npm install -g pnpm

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json tsconfig.base.json ./
COPY lib ./lib
COPY artifacts ./artifacts
COPY scripts ./scripts
RUN pnpm install --frozen-lockfile

FROM deps AS builder
ENV NODE_ENV=production
RUN pnpm run build:production

FROM base AS runner
ENV NODE_ENV=production PORT=8080

WORKDIR /app

COPY --from=builder /app/artifacts/api-server/dist ./dist
COPY --from=builder /app/artifacts/web/dist ./public
COPY --from=deps /app/artifacts ./artifacts
COPY --from=deps /app/lib ./lib
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=deps /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=deps /app/tsconfig.json ./tsconfig.json
COPY --from=deps /app/tsconfig.base.json ./tsconfig.base.json

EXPOSE 8080

CMD ["node", "dist/index.cjs"]
