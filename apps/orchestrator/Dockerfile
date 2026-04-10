FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY apps/orchestrator/package*.json ./apps/orchestrator/
RUN npm ci

COPY . .
RUN npm run build -w @intcloudsysops/orchestrator

FROM node:20-alpine AS runner

ENV NODE_ENV=production

WORKDIR /app
COPY package*.json ./
COPY apps/orchestrator/package*.json ./apps/orchestrator/
RUN npm ci --omit=dev

COPY --from=builder /app/apps/orchestrator/dist ./apps/orchestrator/dist
COPY --from=builder /app/scripts ./scripts

WORKDIR /app/apps/orchestrator
EXPOSE 3011
CMD ["node", "dist/index.js"]
