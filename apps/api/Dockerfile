# Build from repository root:
#   docker build -f apps/api/Dockerfile .

FROM node:20-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
RUN npm ci -w @intcloudsysops/api

FROM node:20-alpine AS builder
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY apps/api ./apps/api
WORKDIR /repo/apps/api
ENV NEXT_TELEMETRY_DISABLED=1
RUN mkdir -p public && npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /repo/apps/api/.next/standalone ./
COPY --from=builder /repo/apps/api/.next/static ./apps/api/.next/static
COPY --from=builder /repo/apps/api/public ./apps/api/public

WORKDIR /app/apps/api

EXPOSE 3000

CMD ["npm", "start"]
