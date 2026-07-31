# Build context must be the repo root (this app depends on the
# @intcloudsysops/academy-blueprint workspace package), e.g.:
#   docker build -f apps/tenant-onboarding-agent/Dockerfile .
FROM node:20-alpine AS build

WORKDIR /repo

# Copy just the manifests needed to resolve this workspace's deps first,
# so dependency installs cache independently of source changes.
COPY package.json package-lock.json ./
COPY apps/tenant-onboarding-agent/package.json apps/tenant-onboarding-agent/package.json
COPY lib/academy-blueprint/package.json lib/academy-blueprint/package.json
RUN npm ci --workspace=@intcloudsysops/tenant-onboarding-agent --workspace=@intcloudsysops/academy-blueprint

COPY apps/tenant-onboarding-agent apps/tenant-onboarding-agent
COPY lib/academy-blueprint lib/academy-blueprint
RUN npm run build --workspace=@intcloudsysops/tenant-onboarding-agent

FROM node:20-alpine
WORKDIR /repo

COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/lib/academy-blueprint ./lib/academy-blueprint
COPY --from=build /repo/apps/tenant-onboarding-agent/dist ./apps/tenant-onboarding-agent/dist
COPY --from=build /repo/apps/tenant-onboarding-agent/package.json ./apps/tenant-onboarding-agent/package.json

# config/blueprints/academy and config/tenants are read at runtime — the
# service only makes sense running against a real checkout, so mount or
# copy them at deploy time rather than baking a stale snapshot into the
# image. See README.md.

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3004/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

EXPOSE 3004
CMD ["node", "apps/tenant-onboarding-agent/dist/index.js"]
