# Build from repository root:
#   docker build -f apps/icso/Dockerfile .

FROM node:20-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY lib/services/package.json ./lib/services/
COPY lib/mission-control-kit/package.json ./lib/mission-control-kit/
COPY lib/game-core/package.json ./lib/game-core/
COPY lib/game-web/package.json ./lib/game-web/
COPY lib/universe/package.json ./lib/universe/
COPY apps/icso/package.json ./apps/icso/
RUN npm ci --ignore-scripts \
  -w @intcloudsysops/services \
  -w @intcloudsysops/mission-control-kit \
  -w @intcloudsysops/game-core \
  -w @intcloudsysops/game-web \
  -w @intcloudsysops/universe \
  -w @intcloudsysops/icso

FROM node:20-alpine AS builder
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/package.json ./package.json
COPY --from=deps /repo/package-lock.json ./package-lock.json
COPY lib/services ./lib/services
COPY lib/mission-control-kit ./lib/mission-control-kit
COPY lib/game-core ./lib/game-core
COPY lib/game-web ./lib/game-web
COPY lib/universe ./lib/universe
COPY apps/icso ./apps/icso
RUN npm run build -w @intcloudsysops/services
WORKDIR /repo/apps/icso
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_SITE_URL=https://intcloudsysops.com
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3015
ENV HOSTNAME=0.0.0.0

COPY --from=builder /repo/apps/icso/.next/standalone ./
COPY --from=builder /repo/apps/icso/.next/static ./apps/icso/.next/static
COPY --from=builder /repo/apps/icso/public ./apps/icso/public

WORKDIR /app/apps/icso

EXPOSE 3015

CMD ["node", "server.js"]
