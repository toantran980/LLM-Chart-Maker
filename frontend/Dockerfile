# Stage 1: Build the React application
FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm ci --workspace=frontend --include-workspace-root=false

COPY frontend/ ./frontend/
COPY shared/ ./shared/

# Build for production
RUN npm run build --workspace=frontend

# Stage 2: Serve with Nginx
FROM nginxinc/nginx-unprivileged:stable-alpine

# Copy built assets
COPY --from=build /app/frontend/dist /usr/share/nginx/html

# Copy custom nginx config
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
