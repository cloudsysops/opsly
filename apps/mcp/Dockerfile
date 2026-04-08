FROM node:20-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/mcp/package.json ./apps/mcp/
COPY apps/llm-gateway/package.json ./apps/llm-gateway/
RUN npm ci -w @intcloudsysops/mcp

FROM node:20-alpine AS builder
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY apps/mcp ./apps/mcp
COPY apps/llm-gateway ./apps/llm-gateway
RUN npm run build -w @intcloudsysops/mcp

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/apps/mcp ./apps/mcp
COPY --from=builder /repo/apps/llm-gateway ./apps/llm-gateway
WORKDIR /app/apps/mcp
EXPOSE 3003
CMD ["npm", "run", "start"]
