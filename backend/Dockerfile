# Stage 1: Build the TypeScript application
FROM node:24-alpine AS build

WORKDIR /app

# Copy package files and install all dependencies (including devDependencies required for tsc)
COPY package*.json ./
RUN npm install

# Copy source code and tsconfig
COPY tsconfig.json ./
COPY src/ ./src/

# Build the TypeScript project
RUN npx tsc

# Stage 2: Production image
FROM node:24-alpine

WORKDIR /app

# Copy package files and install ONLY production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy compiled JS code from the build stage
COPY --from=build /app/dist ./dist

# Switch to the built-in non-root 'node' user for security
USER node

# Expose the port the app runs on
EXPOSE 4000

# Run the compiled application
CMD ["node", "dist/index.js"]
