# syntax=docker/dockerfile:1
# The DCMS API (NestJS). Targets:
#   runtime (default) — the API server, as an unprivileged user
#   migrate           — runs `prisma migrate deploy` as the tables' owner
# Debian rather than Alpine: bcrypt's prebuilt binaries target glibc.

FROM node:22-bookworm-slim AS build
# Prisma's schema engine (migrations) links against OpenSSL.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
# postinstall runs `prisma generate` (src/generated/prisma, not in git).
COPY prisma ./prisma
COPY prisma7.config.ts ./
RUN npm ci
COPY . .
RUN npm run build

# Migrations need the Prisma CLI (a dev dependency) and the migrations.
FROM build AS migrate
ENV NODE_ENV=production
USER node
CMD ["npx", "prisma", "migrate", "deploy"]

# Production dependencies only, with the native modules already built.
FROM build AS prod-deps
RUN npm prune --omit=dev --ignore-scripts

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/scripts ./scripts
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:4000/').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "dist/main.js"]
