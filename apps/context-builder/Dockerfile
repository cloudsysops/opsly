FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY apps/context-builder/package*.json ./apps/context-builder/
RUN npm ci

COPY . .
RUN npm run build -w @intcloudsysops/context-builder

FROM node:20-alpine AS runner

WORKDIR /app
COPY package*.json ./
COPY apps/context-builder/package*.json ./apps/context-builder/
RUN npm ci --omit=dev

COPY --from=builder /app/apps/context-builder/dist ./apps/context-builder/dist

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
