# ─── Stage 1: Builder ───────────────────────────────────────────────────────
# Install ALL dependencies (including devDeps for TypeScript compiler).
# Compile TypeScript → dist/.
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first so this layer is cached when only source changes.
COPY package*.json ./

# Install all dependencies including devDependencies (needed for tsc).
RUN npm ci

# Copy source
COPY tsconfig*.json ./
COPY src/ ./src/

# Compile
RUN npm run build

# ─── Stage 2: Production ────────────────────────────────────────────────────
# Start fresh. Only install production dependencies.
# The TypeORM CLI (needed to run migrations) is part of the "typeorm" package,
# which is a regular dependency — so it IS included in --omit=dev.
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./

# --omit=dev skips devDependencies (TypeScript compiler, Jest, etc.)
# "typeorm" itself is a runtime dep so the CLI is available.
RUN npm ci --omit=dev

# Copy the compiled output from the builder stage.
COPY --from=builder /app/dist ./dist

# Copy the entrypoint script.
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
