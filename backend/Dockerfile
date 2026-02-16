# DCMS Backend - VPS-style Docker image
# Use Debian (slim) not Alpine - Prisma needs compatible OpenSSL
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# Production image
FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends netcat-openbsd \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY prisma ./prisma
COPY src ./src
COPY tsconfig*.json ./

ENV NODE_ENV=production
EXPOSE 3003

# Wait for Postgres, seed, then start
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
