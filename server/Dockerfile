# syntax=docker/dockerfile:1
# Build context must be the repo root (fly deploy --build-context .)
# so that both server/ and prompts/ are accessible.

# ─── Stage 1: Builder ────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app/server

# Copy package files first for layer caching
COPY server/package.json server/pnpm-lock.yaml ./

# Install all deps (including devDeps needed for tsc)
RUN pnpm install --frozen-lockfile

# Copy server source
COPY server/ ./

# Compile TypeScript → dist/
RUN pnpm build

# ─── Stage 2: Runtime ────────────────────────────────────────────
FROM node:20-alpine AS runtime

RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app/server

# Copy package files and install production deps only
COPY server/package.json server/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Copy compiled output from builder
COPY --from=builder /app/server/dist ./dist

# Copy prompts from repo root.
# prompt-bridge.js computes: join(__dirname, '..', 'prompts')
# __dirname in dist/prompt-bridge.js = /app/server/dist
# so prompts must be at /app/server/prompts/
COPY prompts/ ./prompts/

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 8080

CMD ["node", "dist/index.js"]
