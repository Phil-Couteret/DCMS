# DCMS Backend - VPS-style Docker image
# Use Bullseye (Debian 11) - has libssl1.1 which matches Prisma's default binary
FROM node:20-bullseye-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# Production image
FROM node:20-bullseye-slim

RUN apt-get update && apt-get install -y --no-install-recommends openssl netcat-openbsd postgresql-client \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY prisma ./prisma
COPY scripts ./scripts
COPY src ./src
COPY tsconfig*.json ./

ENV NODE_ENV=production
EXPOSE 3003

# Wait for Postgres, seed, then start
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
