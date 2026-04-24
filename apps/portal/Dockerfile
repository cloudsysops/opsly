# Build from repository root:
#   docker build -f apps/portal/Dockerfile .

FROM node:20-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/portal/package.json ./apps/portal/
RUN npm ci --ignore-scripts

FROM node:20-alpine AS builder
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY apps/portal ./apps/portal
WORKDIR /repo/apps/portal
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SUPPORT_EMAIL
ARG NEXT_PUBLIC_PLATFORM_DOMAIN
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SUPPORT_EMAIL=$NEXT_PUBLIC_SUPPORT_EMAIL
ENV NEXT_PUBLIC_PLATFORM_DOMAIN=$NEXT_PUBLIC_PLATFORM_DOMAIN
RUN mkdir -p public && npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3002
ENV HOSTNAME=0.0.0.0

COPY --from=builder /repo/apps/portal/.next/standalone ./
COPY --from=builder /repo/apps/portal/.next/static ./apps/portal/.next/static
COPY --from=builder /repo/apps/portal/public ./apps/portal/public

WORKDIR /app/apps/portal

EXPOSE 3002

CMD ["node", "server.js"]
