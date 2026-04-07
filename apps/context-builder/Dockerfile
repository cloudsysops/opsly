FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY apps/context-builder/package*.json ./apps/context-builder/
RUN npm ci

COPY . .
RUN npm run build -w @intcloudsysops/context-builder

FROM node:20-alpine AS runner

WORKDIR /app
COPY package*.json ./
COPY apps/context-builder/package*.json ./apps/context-builder/
RUN npm ci --omit=dev

COPY --from=builder /app/apps/context-builder/dist ./apps/context-builder/dist

WORKDIR /app/apps/context-builder
EXPOSE 3012
CMD ["node", "dist/server.js"]
