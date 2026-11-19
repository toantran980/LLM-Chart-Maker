# Stage 1: Build the TypeScript application
FROM node:24-alpine AS build

WORKDIR /app

# Install the backend workspace from the repository lockfile.
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm ci --workspace=backend --include-workspace-root=false

# Copy backend source, tsconfig, and shared types
COPY backend/tsconfig.json ./backend/
COPY backend/src/ ./backend/src/
COPY shared/ ./shared/

# Build the TypeScript project
RUN npm run build --workspace=backend

# Stage 2: Production image
FROM node:24-alpine

WORKDIR /app

# Keep the container's default port aligned with its published port.
ENV PORT=4000

# Install only backend production dependencies from the same lockfile.
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm ci --omit=dev --workspace=backend --include-workspace-root=false

# Copy compiled JS code from the build stage (preserves dist/backend/src/ and dist/shared/ structure)
COPY --from=build /app/backend/dist ./dist

# Switch to the built-in non-root 'node' user for security
USER node

# Expose the port the app runs on
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/ready').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Run the compiled application from the real output path
CMD ["node", "dist/backend/src/index.js"]
