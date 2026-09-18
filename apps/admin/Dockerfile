# Build from repository root:
#   docker build -f apps/admin/Dockerfile .

FROM node:20-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/admin/package.json ./apps/admin/
COPY lib/components/package.json ./lib/components/
COPY lib/runtime/package.json ./lib/runtime/
COPY lib/universe/package.json ./lib/universe/
RUN npm ci --ignore-scripts

FROM node:20-alpine AS builder
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/package.json ./package.json
COPY --from=deps /repo/package-lock.json ./package-lock.json
COPY apps/admin ./apps/admin
# Monorepo libs imported from apps/admin (runtime, design tokens, shared UI)
COPY lib ./lib
WORKDIR /repo/apps/admin
ENV NEXT_TELEMETRY_DISABLED=1
# Public environment is rendered at container startup so QA and PROD can run
# the exact same immutable image digest.
RUN npm run build -w @intcloudsysops/universe
RUN mkdir -p public && npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

COPY --from=builder /repo/apps/admin/.next/standalone ./
COPY --from=builder /repo/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=builder /repo/apps/admin/public ./apps/admin/public
COPY scripts/runtime/render-public-runtime-config.mjs /usr/local/lib/render-public-runtime-config.mjs
COPY scripts/runtime/start-next-with-public-config.sh /usr/local/bin/start-next-with-public-config.sh
RUN chmod +x /usr/local/bin/start-next-with-public-config.sh

WORKDIR /app/apps/admin

EXPOSE 3001

CMD ["/usr/local/bin/start-next-with-public-config.sh", "node", "server.js"]
