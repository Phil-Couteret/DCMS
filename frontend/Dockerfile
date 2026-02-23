# DCMS Frontend (Admin PWA) - VPS-style Docker image
# Node 18 - react-scripts 5.0.1 has resolution issues with Node 20
FROM node:18-bullseye-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
ARG REACT_APP_API_URL=http://localhost:3003/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV CI=false
# Bypass broken .bin/react-scripts wrapper - run build script directly
RUN node node_modules/react-scripts/scripts/build.js

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
