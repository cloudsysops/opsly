FROM node:20-alpine

WORKDIR /app

# Install system dependencies for rendering
RUN apk add --no-cache \
  sox \
  ffmpeg \
  libsox-fmt-all

# Install node dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY apps/rendering-engine/src ./src

# Build TypeScript
RUN npm run build

# Create cache directory
RUN mkdir -p /tmp/hermes-renders

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3005/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

EXPOSE 3005

CMD ["node", "dist/index.js"]
