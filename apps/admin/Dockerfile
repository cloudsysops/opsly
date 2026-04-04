# Build from repository root:
#   docker build -f apps/admin/Dockerfile .

FROM node:20-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/admin/package.json ./apps/admin/
RUN npm ci -w @intcloudsysops/admin

FROM node:20-alpine AS builder
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY apps/admin ./apps/admin
WORKDIR /repo/apps/admin
ENV NEXT_TELEMETRY_DISABLED=1
RUN mkdir -p public && npm run build

FROM node:20-alpine AS runner
WORKDIR /repo
ENV NODE_ENV=production
ENV PORT=3001
COPY --from=builder /repo/apps/admin/.next ./apps/admin/.next
COPY --from=builder /repo/apps/admin/public ./apps/admin/public
COPY --from=builder /repo/apps/admin/package.json ./apps/admin/package.json
COPY --from=builder /repo/node_modules ./node_modules
WORKDIR /repo/apps/admin
EXPOSE 3001
CMD ["npm", "start"]
