# Build from repository root:
#   docker build -f apps/api/Dockerfile .

FROM node:20-alpine AS deps
WORKDIR /repo
COPY . .
RUN npm ci --ignore-scripts \
  -w @intcloudsysops/types \
  -w @intcloudsysops/pattern-catalog \
  -w @intcloudsysops/services \
  -w @intcloudsysops/prompt-guard \
  -w @intcloudsysops/llm-gateway \
  -w @intcloudsysops/ml \
  -w @intcloudsysops/notebooklm-agent \
  -w @intcloudsysops/ai-board \
  -w @intcloudsysops/api

FROM node:20-alpine AS builder

WORKDIR /repo
COPY --from=deps /repo ./
RUN npm run build -w @intcloudsysops/types && \
    npm run build -w @intcloudsysops/runtime && \
    npm run build -w @intcloudsysops/pattern-catalog && \
    npm run build -w @intcloudsysops/services && \
    npm run build -w @intcloudsysops/prompt-guard && \
    npm run build -w @intcloudsysops/llm-gateway && \
    npm run build -w @intcloudsysops/ml && \
    npm run build -w @intcloudsysops/notebooklm-agent && \
    npm run build -w @intcloudsysops/ai-board
WORKDIR /repo/apps/api
ENV NEXT_TELEMETRY_DISABLED=1
# CORS origins are resolved at request/runtime by middleware + lib/cors-origins.ts
# from the container env_file. Do not bake PLATFORM_DOMAIN/NEXT_PUBLIC_ADMIN_URL
# into this image: QA and production must be able to consume the same digest.
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
