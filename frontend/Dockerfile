# syntax=docker/dockerfile:1
# The DCMS public site (Next.js standalone server), as an unprivileged user.

FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# The API as the browser reaches it (guest bookings). NEXT_PUBLIC_ values
# are fixed at build time; the server side reads API_URL at run time.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npx next build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
# (no public/ folder)
USER node
EXPOSE 3000
CMD ["node", "server.js"]
