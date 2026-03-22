FROM node:20-alpine AS base

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

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/artifacts/api-server/node_modules ./artifacts/api-server/node_modules
COPY --from=deps /app/artifacts/web/node_modules ./artifacts/web/node_modules
COPY --from=deps /app/lib ./lib
COPY --from=builder /app/artifacts/api-server/dist ./dist
COPY --from=builder /app/artifacts/web/dist ./public
COPY package.json ./

EXPOSE 8080

CMD ["node", "dist/index.cjs"]
