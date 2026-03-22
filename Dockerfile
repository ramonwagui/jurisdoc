FROM node:20-slim AS base

WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json tsconfig.base.json ./
COPY lib ./lib
COPY artifacts ./artifacts
COPY scripts ./scripts
RUN npm install

FROM deps AS builder
ENV NODE_ENV=production
RUN npm run build:production

FROM base AS runner
ENV NODE_ENV=production PORT=8080

WORKDIR /app

COPY --from=builder /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=builder /app/artifacts/web/dist ./public
COPY --from=deps /app/artifacts/api-server/node_modules ./artifacts/api-server/node_modules
COPY --from=deps /app/artifacts/api-server/package.json ./artifacts/api-server/package.json
COPY --from=deps /app/lib ./lib
COPY package.json pnpm-lock.yaml tsconfig.json tsconfig.base.json ./

EXPOSE 8080

CMD ["node", "artifacts/api-server/dist/index.cjs"]
