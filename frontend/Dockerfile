# DCMS Frontend (Admin PWA) - VPS-style Docker image
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
# Build for API mode; runtime uses window.location.hostname + :3003
ENV REACT_APP_API_URL=http://localhost:3003/api
ENV CI=true
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
