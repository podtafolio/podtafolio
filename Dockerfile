# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies (including dev dependencies for build)
RUN --mount=type=cache,target=/root/.npm npm ci

# Copy source code
COPY . .

# Run tests
RUN npm run test

# Build the Nuxt application
RUN npm run build

# Stage 2: Production
FROM node:22-alpine

WORKDIR /app

# Copy package files for production install
COPY package.json package-lock.json ./

# Install only production dependencies
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

# Copy the built application from the builder stage
COPY --from=builder /app/.output ./.output

# Copy migrations folder
COPY --from=builder /app/server/database/migrations ./migrations

# Environment variables
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV MIGRATIONS_FOLDER=/app/migrations
# DB_PATH and VOLUME are no longer needed as we use Turso

# Expose the port
EXPOSE 3000

# Start the application
CMD ["node", ".output/server/index.mjs"]
