# DCMS Public Website (customer portal)
# Node 22 - Vite 8 requires Node >=20.19 or >=22.12 (the old Node 18 pin
# was specifically a react-scripts 5.0.1 workaround, no longer needed
# now that the build runs on Vite instead - see docs/roadmap.md item 19)
FROM node:22-bullseye-slim AS builder

WORKDIR /app
COPY package*.json ./
# No longer needs --legacy-peer-deps - that flag was working around a
# typescript/react-scripts peer conflict; react-scripts is gone now.
RUN npm install

COPY . .
# Set API URL at build time - override for production
ARG VITE_API_URL=http://localhost:3003/api
ENV VITE_API_URL=$VITE_API_URL
RUN npx vite build

# nginxinc/nginx-unprivileged: same nginx image, but pre-configured to run
# as a non-root user (uid 101) on an unprivileged port - avoids the classic
# "nginx needs root to bind :80" tradeoff instead of adding a USER directive
# on top of the stock image, which would just fail to bind.
FROM nginxinc/nginx-unprivileged:alpine
COPY --from=builder /app/build /usr/share/nginx/html
RUN echo 'server { listen 8080; root /usr/share/nginx/html; index index.html; location / { try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
