# Stage 1: Build the React application
FROM node:24-alpine AS build

WORKDIR /app

COPY frontend/package*.json ./frontend/
RUN npm --prefix frontend install

COPY frontend/ ./frontend/
COPY shared/ ./shared/

# Build for production
RUN npm --prefix frontend run build

# Stage 2: Serve with Nginx
FROM nginxinc/nginx-unprivileged:stable-alpine

# Copy built assets
COPY --from=build /app/frontend/dist /usr/share/nginx/html

# Copy custom nginx config
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
