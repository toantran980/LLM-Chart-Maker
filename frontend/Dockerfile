# Stage 1: Build the React application
FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build for production
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginxinc/nginx-unprivileged:stable-alpine

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
