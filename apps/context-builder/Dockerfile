FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY packages/types/package.json ./packages/types/
COPY apps/context-builder/package*.json ./apps/context-builder/
COPY apps/llm-gateway/package*.json ./apps/llm-gateway/
RUN npm ci --ignore-scripts

COPY packages/types ./packages/types
COPY apps/llm-gateway ./apps/llm-gateway
COPY apps/context-builder ./apps/context-builder
RUN npm ci --ignore-scripts \
  -w @intcloudsysops/types \
  -w @intcloudsysops/llm-gateway \
  -w @intcloudsysops/context-builder
# Build types first (required by context-builder), then other workspaces
RUN npm run build -w @intcloudsysops/types && \
    npm run build -w @intcloudsysops/llm-gateway && \
    npm run build -w @intcloudsysops/context-builder
RUN npm prune --omit=dev

FROM node:20-alpine AS runner

WORKDIR /app
# Runtime: linked workspace + pruned node_modules from builder (includes @intcloudsysops/types).
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/llm-gateway ./apps/llm-gateway
COPY --from=builder /app/apps/context-builder/dist ./apps/context-builder/dist
COPY --from=builder /app/apps/context-builder/package.json ./apps/context-builder/package.json

# Repo-First RAG: snapshot de docs + índice (override en VPS con volumen /opt/opsly)
COPY --from=builder /app/docs /app/repo/docs
COPY --from=builder /app/AGENTS.md /app/repo/AGENTS.md
COPY --from=builder /app/VISION.md /app/repo/VISION.md
COPY --from=builder /app/config/knowledge-index.json /app/repo/config/knowledge-index.json

ENV OPS_REPO_ROOT=/app/repo
ENV KNOWLEDGE_INDEX_PATH=/app/repo/config/knowledge-index.json

WORKDIR /app/apps/context-builder
EXPOSE 3012
CMD ["node", "dist/src/index.js"]