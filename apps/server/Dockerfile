# Base
FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# Pruner
FROM base AS pruner
COPY . .
RUN pnpm dlx turbo prune server --docker

FROM base AS builder
ENV NODE_ENV=production
WORKDIR /app
COPY --from=pruner /app/out/json/ ./
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ ./
RUN pnpm run build:server
WORKDIR /app/apps/server
EXPOSE 3000
CMD ["pnpm", "start"]
