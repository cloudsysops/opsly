# Build from repository root:
#   docker build -f apps/api/Dockerfile .

FROM node:20-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
RUN npm ci -w @intcloudsysops/api

FROM node:20-alpine AS builder
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY apps/api ./apps/api
WORKDIR /repo/apps/api
ENV NEXT_TELEMETRY_DISABLED=1
RUN mkdir -p public && npm run build

FROM node:20-alpine AS runner
WORKDIR /repo
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /repo/apps/api/.next ./apps/api/.next
COPY --from=builder /repo/apps/api/public ./apps/api/public
COPY --from=builder /repo/apps/api/package.json ./apps/api/package.json
COPY --from=builder /repo/node_modules ./node_modules
WORKDIR /repo/apps/api
EXPOSE 3000
CMD ["npm", "start"]
