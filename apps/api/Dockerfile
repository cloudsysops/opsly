# Build from repository root:
#   docker build -f apps/api/Dockerfile .

FROM node:20-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/ml/package.json ./apps/ml/
COPY apps/llm-gateway/package.json ./apps/llm-gateway/
COPY apps/notebooklm-agent/package.json ./apps/notebooklm-agent/
COPY packages/types/package.json ./packages/types/
RUN npm ci --ignore-scripts
RUN npm ci --ignore-scripts \
  -w @intcloudsysops/types \
  -w @intcloudsysops/llm-gateway \
  -w @intcloudsysops/ml \
  -w @intcloudsysops/notebooklm-agent \
  -w @intcloudsysops/api

FROM node:20-alpine AS builder

WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/package.json ./package.json
COPY --from=deps /repo/package-lock.json ./package-lock.json
COPY apps/api ./apps/api
COPY apps/ml ./apps/ml
COPY apps/llm-gateway ./apps/llm-gateway
COPY apps/notebooklm-agent ./apps/notebooklm-agent
COPY packages/types ./packages/types
RUN npm ci --ignore-scripts \
  -w @intcloudsysops/types \
  -w @intcloudsysops/llm-gateway \
  -w @intcloudsysops/ml \
  -w @intcloudsysops/notebooklm-agent \
  -w @intcloudsysops/api
RUN npm run build -w @intcloudsysops/types && \
    npm run build -w @intcloudsysops/llm-gateway && \
    npm run build -w @intcloudsysops/ml && \
    npm run build -w @intcloudsysops/notebooklm-agent
WORKDIR /repo/apps/api
ENV NEXT_TELEMETRY_DISABLED=1
# CORS en next.config: se resuelve en build (mismo origen admin = https://admin.${PLATFORM_DOMAIN})
ARG PLATFORM_DOMAIN
ENV PLATFORM_DOMAIN=$PLATFORM_DOMAIN
ARG NEXT_PUBLIC_ADMIN_URL
ENV NEXT_PUBLIC_ADMIN_URL=$NEXT_PUBLIC_ADMIN_URL
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

CMD ["node", "server.js"]
