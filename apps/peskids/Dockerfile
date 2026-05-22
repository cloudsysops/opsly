# Multi-stage build for peskids Next.js 14 application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (npm install: lockfile may lag package.json in standalone app)
RUN npm install

# Copy application code
COPY . .

# Build Next.js application
RUN mkdir -p public && npm run build

# Production stage — reuse builder deps (lockfile is monorepo-managed)
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./next.config.js

# Health check for Opsly infrastructure monitoring
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3004', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

EXPOSE 3004

CMD ["npm", "start"]
