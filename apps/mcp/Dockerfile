FROM node:20-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/mcp/package.json ./apps/mcp/
COPY apps/llm-gateway/package.json ./apps/llm-gateway/
COPY apps/agents/notebooklm/package.json ./apps/agents/notebooklm/
RUN npm ci -w @intcloudsysops/mcp

FROM node:20-alpine AS builder
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/package.json ./package.json
COPY --from=deps /repo/package-lock.json ./package-lock.json
COPY apps/mcp ./apps/mcp
COPY apps/llm-gateway ./apps/llm-gateway
COPY apps/agents/notebooklm ./apps/agents/notebooklm
RUN npm run build -w @intcloudsysops/mcp

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/apps/mcp ./apps/mcp
COPY --from=builder /repo/apps/llm-gateway ./apps/llm-gateway
COPY --from=builder /repo/apps/agents/notebooklm ./apps/agents/notebooklm
WORKDIR /app/apps/mcp
EXPOSE 3003
CMD ["npm", "run", "start"]
