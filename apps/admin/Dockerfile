# Build from repository root:
#   docker build -f apps/admin/Dockerfile .

FROM node:20-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/admin/package.json ./apps/admin/
RUN npm ci --ignore-scripts

FROM node:20-alpine AS builder
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY apps/admin ./apps/admin
RUN npm ci --ignore-scripts -w @intcloudsysops/admin
WORKDIR /repo/apps/admin
ENV NEXT_TELEMETRY_DISABLED=1
# Demo sin login (familia/stakeholders). Override: docker build --build-arg NEXT_PUBLIC_ADMIN_PUBLIC_DEMO=false
ARG NEXT_PUBLIC_ADMIN_PUBLIC_DEMO=true
ENV NEXT_PUBLIC_ADMIN_PUBLIC_DEMO=$NEXT_PUBLIC_ADMIN_PUBLIC_DEMO
# NEXT_PUBLIC_* se inyectan en build (no en runtime)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
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
