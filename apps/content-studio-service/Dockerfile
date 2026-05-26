# ── Builder ───────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace manifests
COPY package.json package-lock.json ./

# Copy lib/content-studio and app manifests
COPY lib/content-studio/package.json ./lib/content-studio/
COPY apps/content-studio-service/package.json ./apps/content-studio-service/

RUN npm ci --ignore-scripts

# Copy source
COPY lib/content-studio/ ./lib/content-studio/
COPY apps/content-studio-service/ ./apps/content-studio-service/

# Build lib first, then app
RUN npm run build --workspace=@intcloudsysops/content-studio && \
    npm run build --workspace=@intcloudsysops/content-studio-service

# ── Runner ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

ENV NODE_ENV=production
ENV PORT=3013

WORKDIR /app

# Copy only what's needed to run
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules

COPY --from=builder /app/lib/content-studio/dist ./lib/content-studio/dist
COPY --from=builder /app/lib/content-studio/package.json ./lib/content-studio/package.json

COPY --from=builder /app/apps/content-studio-service/dist ./apps/content-studio-service/dist
COPY --from=builder /app/apps/content-studio-service/package.json ./apps/content-studio-service/package.json

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3013/health || exit 1

EXPOSE 3013

CMD ["node", "apps/content-studio-service/dist/index.js"]
