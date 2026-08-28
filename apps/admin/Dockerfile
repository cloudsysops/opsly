# Build from repository root:
#   docker build -f apps/admin/Dockerfile .

FROM node:20-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/admin/package.json ./apps/admin/
COPY lib/components/package.json ./lib/components/
COPY lib/runtime/package.json ./lib/runtime/
RUN npm ci --ignore-scripts

FROM node:20-alpine AS builder
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/package.json ./package.json
COPY --from=deps /repo/package-lock.json ./package-lock.json
COPY apps/admin ./apps/admin
# Monorepo libs imported from apps/admin (runtime, design tokens, shared UI)
COPY lib ./lib
WORKDIR /repo/apps/admin
ENV NEXT_TELEMETRY_DISABLED=1
# Producción: false (login Supabase obligatorio). Solo local/staging: --build-arg NEXT_PUBLIC_ADMIN_PUBLIC_DEMO=true
ARG NEXT_PUBLIC_ADMIN_PUBLIC_DEMO=false
ENV NEXT_PUBLIC_ADMIN_PUBLIC_DEMO=$NEXT_PUBLIC_ADMIN_PUBLIC_DEMO
# NEXT_PUBLIC_* se inyectan en build (no en runtime)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
# Build libs required by admin (content-studio/studio subpath needs dist/)
RUN npm run build -w @intcloudsysops/universe && \
    npm run build -w @intcloudsysops/content-studio
RUN mkdir -p public && npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

COPY --from=builder /repo/apps/admin/.next/standalone ./
COPY --from=builder /repo/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=builder /repo/apps/admin/public ./apps/admin/public

WORKDIR /app/apps/admin

EXPOSE 3001

CMD ["node", "server.js"]
