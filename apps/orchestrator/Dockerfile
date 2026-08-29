# Monorepo: el orchestrator importa @intcloudsysops/ml en runtime (p. ej. AgentClassifierWorker).
# El runner anterior solo hacía `npm ci` parcial y no incluía el workspace `ml` → MODULE_NOT_FOUND en producción.
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
COPY turbo.json ./
COPY tsconfig.json ./
COPY apps ./apps
COPY packages ./packages
COPY lib ./lib
COPY scripts ./scripts
COPY config ./config
RUN npm ci --ignore-scripts

RUN npm run build -w @intcloudsysops/types && \
    npm run build -w @intcloudsysops/notebooklm-agent && \
    npm run build -w @intcloudsysops/universe && \
    npm run build -w @intcloudsysops/content-studio && \
    npm run build -w @intcloudsysops/pattern-catalog && \
    npm run build -w @intcloudsysops/sigma-harness && \
    npm run build -w @intcloudsysops/prompt-guard && \
    npm run build -w @intcloudsysops/llm-gateway && \
    npm run build -w @intcloudsysops/ml && \
    npm run build -w @intcloudsysops/external-agent-registry && \
    npm run build -w @intcloudsysops/agent-task-core && \
    npm run build -w @intcloudsysops/git-branch-orchestrator && \
    npm run build -w @intcloudsysops/session-manager && \
    npm run build -w @intcloudsysops/runtime && \
    npm run build -w @intcloudsysops/voice-messaging && \
    npm run build -w @intcloudsysops/orchestrator
# NO npm prune --omit=dev aquí, puede borrar dependencias transitivas compartilhadas

FROM node:20-alpine AS runner

ENV NODE_ENV=production

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/orchestrator/dist ./apps/orchestrator/dist
COPY --from=builder /app/apps/orchestrator/package.json ./apps/orchestrator/package.json
COPY --from=builder /app/apps/orchestrator/node_modules ./apps/orchestrator/node_modules
COPY --from=builder /app/apps/ml ./apps/ml
COPY --from=builder /app/apps/llm-gateway ./apps/llm-gateway
COPY --from=builder /app/apps/notebooklm-agent ./apps/notebooklm-agent
COPY --from=builder /app/packages/types ./packages/types
COPY --from=builder /app/lib/prompt-guard ./lib/prompt-guard
COPY --from=builder /app/lib/pattern-catalog ./lib/pattern-catalog
COPY --from=builder /app/lib/sigma-harness ./lib/sigma-harness
COPY --from=builder /app/lib/external-agent-registry ./lib/external-agent-registry
COPY --from=builder /app/lib/agent-task-core ./lib/agent-task-core
COPY --from=builder /app/lib/session-manager/dist ./lib/session-manager/dist
COPY --from=builder /app/lib/session-manager/package.json ./lib/session-manager/package.json
COPY --from=builder /app/lib/git-branch-orchestrator/dist ./lib/git-branch-orchestrator/dist
COPY --from=builder /app/lib/git-branch-orchestrator/package.json ./lib/git-branch-orchestrator/package.json
COPY --from=builder /app/lib/runtime/dist ./lib/runtime/dist
COPY --from=builder /app/lib/runtime/package.json ./lib/runtime/package.json
COPY --from=builder /app/lib/content-studio/dist ./lib/content-studio/dist
COPY --from=builder /app/lib/content-studio/package.json ./lib/content-studio/package.json
COPY --from=builder /app/lib/universe/dist ./lib/universe/dist
COPY --from=builder /app/lib/universe/package.json ./lib/universe/package.json
COPY --from=builder /app/lib/voice-messaging/dist ./lib/voice-messaging/dist
COPY --from=builder /app/lib/voice-messaging/package.json ./lib/voice-messaging/package.json
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/config/git-branch-policy.json ./config/git-branch-policy.json
COPY --from=builder /app/config/external-agent-registry.json ./config/external-agent-registry.json
COPY --from=builder /app/config/runtime-governor.json ./config/runtime-governor.json

# Workspace symlinks: Docker COPY follows symlinks within the copy scope,
# but npm workspace symlinks point outside node_modules (../../lib/*).
# Create explicit symlinks so transitive imports resolve at runtime.
RUN mkdir -p node_modules/@intcloudsysops && \
    for pkg in universe content-studio game-core game-web; do \
      [ -d "lib/${pkg}" ] && ln -sf "../../lib/${pkg}" "node_modules/@intcloudsysops/${pkg}"; \
    done

WORKDIR /app/apps/orchestrator
EXPOSE 3011
CMD ["node", "dist/index.js"]
