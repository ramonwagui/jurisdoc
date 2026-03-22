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

WORKDIR /app/artifacts/api-server

COPY --from=builder /app/artifacts/api-server/dist ./dist
COPY --from=builder /app/artifacts/web/dist ./public
COPY --from=builder /app/artifacts/api-server/package.json ./

RUN npm install --omit=dev

EXPOSE 8080

CMD ["node", "dist/index.cjs"]
