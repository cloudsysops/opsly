FROM node:18-alpine

WORKDIR /app

# Install dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY packages/skills/manifest ./packages/skills/manifest

# Install
RUN npm ci --production

# Copy source
COPY apps/slack-bot ./apps/slack-bot

# Build
RUN npm run build --workspace=@intcloudsysops/slack-bot

EXPOSE 3010

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3010/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

WORKDIR /app/apps/slack-bot

CMD ["node", "dist/src/index.js"]
