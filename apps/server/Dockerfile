# Base
FROM node:20-slim AS base
WORKDIR /app

# Pruner
FROM base AS pruner
COPY . .
RUN pnpm dlx turbo prune server --docker

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ ./
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ ./
RUN pnpm run compile:server

# Runner (minimal)
FROM gcr.io/distroless/base-debian12 AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/server/server ./apps/server
WORKDIR /app/apps
EXPOSE 3000
CMD ["./server"]