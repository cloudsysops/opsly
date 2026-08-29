FROM node:20-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages/types/package.json ./packages/types/
COPY lib/services/package.json ./lib/services/
COPY lib/universe/package.json ./lib/universe/
COPY lib/content-studio/package.json ./lib/content-studio/
COPY lib/pattern-catalog/package.json ./lib/pattern-catalog/
COPY lib/sigma-harness/package.json ./lib/sigma-harness/
COPY lib/prompt-guard/package.json ./lib/prompt-guard/
COPY apps/mcp/package.json ./apps/mcp/
COPY apps/llm-gateway/package.json ./apps/llm-gateway/
COPY apps/notebooklm-agent/package.json ./apps/notebooklm-agent/
RUN npm ci --ignore-scripts \
  -w @intcloudsysops/types \
  -w @intcloudsysops/services \
  -w @intcloudsysops/universe \
  -w @intcloudsysops/content-studio \
  -w @intcloudsysops/pattern-catalog \
  -w @intcloudsysops/sigma-harness \
  -w @intcloudsysops/prompt-guard \
  -w @intcloudsysops/llm-gateway \
  -w @intcloudsysops/notebooklm-agent \
  -w @intcloudsysops/mcp

FROM node:20-alpine AS builder
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/package.json ./package.json
COPY --from=deps /repo/package-lock.json ./package-lock.json
COPY tsconfig.json tsconfig.workspace-paths.json ./
COPY packages/types ./packages/types
COPY lib/services ./lib/services
COPY lib/universe ./lib/universe
COPY lib/content-studio ./lib/content-studio
COPY --from=deps /repo/lib/content-studio/node_modules ./lib/content-studio/node_modules
COPY lib/pattern-catalog ./lib/pattern-catalog
COPY lib/sigma-harness ./lib/sigma-harness
COPY lib/prompt-guard ./lib/prompt-guard
COPY apps/mcp ./apps/mcp
COPY --from=deps /repo/apps/mcp/node_modules ./apps/mcp/node_modules
COPY apps/llm-gateway ./apps/llm-gateway
COPY --from=deps /repo/apps/llm-gateway/node_modules ./apps/llm-gateway/node_modules
COPY apps/notebooklm-agent ./apps/notebooklm-agent
# Build types first (required by downstream workspaces), then other workspaces
RUN npm run build -w @intcloudsysops/types && \
    npm run build -w @intcloudsysops/services && \
    npm run build -w @intcloudsysops/universe && \
    npm run build -w @intcloudsysops/content-studio && \
    npm run build -w @intcloudsysops/pattern-catalog && \
    npm run build -w @intcloudsysops/sigma-harness && \
    npm run build -w @intcloudsysops/prompt-guard && \
    npm run build -w @intcloudsysops/llm-gateway && \
    npm run build -w @intcloudsysops/notebooklm-agent && \
    npm run build -w @intcloudsysops/mcp

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /repo/package.json ./package.json
COPY --from=builder /repo/package-lock.json ./package-lock.json
COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/packages/types ./packages/types
COPY --from=builder /repo/apps/mcp ./apps/mcp
COPY --from=builder /repo/lib/services ./lib/services
COPY --from=builder /repo/lib/universe ./lib/universe
COPY --from=builder /repo/lib/content-studio ./lib/content-studio
COPY --from=builder /repo/lib/pattern-catalog ./lib/pattern-catalog
COPY --from=builder /repo/lib/sigma-harness ./lib/sigma-harness
COPY --from=builder /repo/lib/prompt-guard ./lib/prompt-guard
COPY --from=builder /repo/apps/llm-gateway ./apps/llm-gateway
COPY --from=builder /repo/apps/notebooklm-agent ./apps/notebooklm-agent

# Workspace symlinks: Docker COPY breaks npm workspace symlinks that point
# outside node_modules (../../lib/*). Create explicit symlinks for transitive deps.
RUN mkdir -p node_modules/@intcloudsysops && \
    for pkg in universe content-studio game-core game-web; do \
      if [ -d "lib/${pkg}" ]; then ln -sf "../../lib/${pkg}" "node_modules/@intcloudsysops/${pkg}"; fi; \
    done

WORKDIR /app/apps/mcp
EXPOSE 3003
CMD ["npm", "run", "start"]
