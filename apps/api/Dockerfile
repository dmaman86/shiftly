# Build from the repository root, which is the workspace root:
#   docker build -f apps/api/Dockerfile .
# The root .dockerignore is an allowlist, so .env files never reach the image.

FROM oven/bun:1.3.14 AS deps
WORKDIR /app
# Every workspace manifest is needed for bun to resolve the lockfile; only
# @shiftly/api production dependencies are installed.
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/domain/package.json packages/domain/
RUN bun install --frozen-lockfile --production --filter @shiftly/api --ignore-scripts

FROM node:24-slim
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080 \
    ARTIFACTS_DIR=/tmp/artifacts
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY apps/api/package.json apps/api/
COPY apps/api/src apps/api/src
USER node
EXPOSE 8080
# Node 24 runs the TypeScript sources directly (type stripping): no build step.
CMD ["node", "apps/api/src/server.ts"]
