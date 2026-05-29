# Panini Lab — multi-stage monorepo build
# Context: repo root (needs lib/conversational-runtime, packages/opsly-core)
# Output: Next.js standalone at .next/standalone/apps/panini-lab/server.js

# ─── Stage 1: builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy monorepo root manifests first (cache layer)
COPY package*.json ./
COPY turbo.json ./

# Copy all workspace manifests so npm ci resolves the full dep tree
COPY lib/conversational-runtime/package.json ./lib/conversational-runtime/
COPY packages/opsly-core/package.json         ./packages/opsly-core/
COPY packages/types/package.json              ./packages/types/
COPY apps/panini-lab/package.json             ./apps/panini-lab/

# Install everything at monorepo root (includes all workspaces)
RUN npm ci --ignore-scripts

# Copy source — minimal set needed for panini-lab build
COPY lib/conversational-runtime/ ./lib/conversational-runtime/
COPY packages/opsly-core/        ./packages/opsly-core/
COPY packages/types/             ./packages/types/
COPY apps/panini-lab/            ./apps/panini-lab/

# Build
WORKDIR /app/apps/panini-lab
RUN NEXT_TELEMETRY_DISABLED=1 npx next build

# ─── Stage 2: runner ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3005

# Standalone server + static assets
COPY --from=builder /app/apps/panini-lab/.next/standalone ./
COPY --from=builder /app/apps/panini-lab/.next/static     ./apps/panini-lab/.next/static
COPY --from=builder /app/apps/panini-lab/public           ./apps/panini-lab/public

# Security: run as non-root
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs
USER nextjs

EXPOSE 3005

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3005/dashboard',r=>{if(r.statusCode>=500)process.exit(1)})"

CMD ["node", "apps/panini-lab/server.js"]
