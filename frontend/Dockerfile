# DCMS Frontend (Admin PWA) - VPS-style Docker image
# Node 18 - react-scripts 5.0.1 has resolution issues with Node 20
FROM node:18-bullseye-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
# Empty = use hostname (test.admin → test.api, admin → api, localhost → localhost:3003)
ARG REACT_APP_API_URL=
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV CI=false
# Bypass broken .bin/react-scripts wrapper - run build script directly
RUN node node_modules/react-scripts/scripts/build.js

# nginxinc/nginx-unprivileged: same nginx image, but pre-configured to run
# as a non-root user (uid 101) on an unprivileged port - avoids the classic
# "nginx needs root to bind :80" tradeoff instead of adding a USER directive
# on top of the stock image, which would just fail to bind.
FROM nginxinc/nginx-unprivileged:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
