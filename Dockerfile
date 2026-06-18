# syntax=docker/dockerfile:1

# ---- Build stage ----
FROM node:22-slim AS build
WORKDIR /app
# Default DB url for build-time tooling (the real one is set at runtime).
ENV DATABASE_URL=file:./dev.db

# Toolchain so better-sqlite3 can compile if a prebuilt binary isn't available.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Pin the same pnpm the project uses so onlyBuiltDependencies is honored.
RUN corepack enable && corepack prepare pnpm@10.24.0 --activate

# Install deps first (postinstall runs `prisma generate`, which needs the schema).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

# Build the app.
COPY . .
RUN pnpm build

# ---- Runtime stage ----
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
# SQLite file and uploads live on mounted volumes so they survive restarts.
ENV DATABASE_URL=file:/data/dev.db
ENV PORT=3000
# So `prisma`, `next` and `tsx` (used by the seed) resolve as bare commands.
ENV PATH="/app/node_modules/.bin:${PATH}"

# openssl silences a Prisma CLI probe warning during migrate/seed.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Bring over the whole built app (incl. node_modules with the compiled
# better-sqlite3 binary and the generated Prisma client).
COPY --from=build /app ./

RUN mkdir -p /data /app/public/uploads

EXPOSE 3000

# Apply migrations, seed once on first boot, then start Next.js bound to 0.0.0.0.
CMD ["sh", "-c", "prisma migrate deploy && { [ -f /data/.seeded ] || { prisma db seed || true; touch /data/.seeded; }; } && exec next start -H 0.0.0.0 -p ${PORT:-3000}"]
