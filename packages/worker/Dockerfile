FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# 1. Prune completely down to only the @gis-app/worker workspace
FROM base AS pruner
RUN apk add --no-cache libc6-compat
COPY . .
RUN pnpm dlx turbo prune @gis-app/worker --docker

# 2. Build the project
FROM base AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN pnpm run build --filter @gis-app/worker
# Wipe development utilities out of the bundle (e.g. typescript, loaders)
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

# 3. Isolated Runner footprint
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache libc6-compat

# Map over everything required but keep image completely minimal
COPY --from=builder /app .

WORKDIR /app/packages/worker
EXPOSE 4000
CMD ["npm", "run", "start"]
