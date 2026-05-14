# Use Node.js LTS (Lightweight)
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build the TypeScript project
RUN npx tsc

# Expose the port the app runs on
EXPOSE 4000

# Run the compiled application
CMD ["node", "dist/index.js"]
