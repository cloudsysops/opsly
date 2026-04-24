FROM node:20-alpine AS deps

WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/types/package.json ./packages/types/
COPY apps/llm-gateway/package.json ./apps/llm-gateway/
RUN npm ci --ignore-scripts
RUN npm ci --ignore-scripts \
  -w @intcloudsysops/types \
  -w @intcloudsysops/llm-gateway

FROM node:20-alpine AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/package-lock.json ./package-lock.json
COPY packages/types ./packages/types
COPY apps/llm-gateway ./apps/llm-gateway
RUN npm ci --ignore-scripts \
  -w @intcloudsysops/types \
  -w @intcloudsysops/llm-gateway
RUN npm run build -w @intcloudsysops/types && \
    npm run build -w @intcloudsysops/llm-gateway

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/types ./packages/types
COPY --from=builder /app/apps/llm-gateway ./apps/llm-gateway

WORKDIR /app/apps/llm-gateway
EXPOSE 3010
CMD ["node", "dist/src/server.js"]
