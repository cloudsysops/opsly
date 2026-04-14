FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY apps/llm-gateway/package*.json ./apps/llm-gateway/
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build -w @intcloudsysops/llm-gateway

FROM node:20-alpine AS runner

WORKDIR /app
COPY package*.json ./
COPY apps/llm-gateway/package*.json ./apps/llm-gateway/
RUN npm ci --ignore-scripts --omit=dev

COPY --from=builder /app/apps/llm-gateway/dist ./apps/llm-gateway/dist

WORKDIR /app/apps/llm-gateway
EXPOSE 3010
CMD ["node", "dist/src/server.js"]
