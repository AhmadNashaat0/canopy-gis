# Base
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
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
RUN pnpm run build:server

# Runner (minimal)
FROM node:20-slim  AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/server/dist ./apps/server
WORKDIR /app/apps
EXPOSE 3000
CMD ["node", "./server/index.mjs"]