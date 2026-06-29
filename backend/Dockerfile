# Stage 1: Build the TypeScript application
FROM node:24-alpine AS build

WORKDIR /app

# Copy backend package files and install all dependencies (including devDependencies required for tsc)
COPY backend/package*.json ./backend/
RUN npm --prefix backend install

# Copy backend source, tsconfig, and shared types
COPY backend/tsconfig.json ./backend/
COPY backend/src/ ./backend/src/
COPY shared/ ./shared/

# Build the TypeScript project
RUN npm --prefix backend run build

# Stage 2: Production image
FROM node:24-alpine

WORKDIR /app

# Copy backend package.json and install ONLY production dependencies at /app/node_modules
# so Node's standard upward module resolution finds them from /app/dist/backend/src/
COPY backend/package*.json ./
RUN npm install --omit=dev

# Copy compiled JS code from the build stage (preserves dist/backend/src/ and dist/shared/ structure)
COPY --from=build /app/backend/dist ./dist

# Switch to the built-in non-root 'node' user for security
USER node

# Expose the port the app runs on
EXPOSE 4000

# Run the compiled application from the real output path
CMD ["node", "dist/backend/src/index.js"]
