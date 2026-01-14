# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Enable corepack for Yarn
RUN corepack enable

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies (including dev dependencies for build)
RUN --mount=type=cache,target=/root/.yarn YARN_CACHE_FOLDER=/root/.yarn yarn install --immutable

# Copy source code
COPY . .

# Run tests
RUN yarn test

# Build the Nuxt application
RUN yarn build

# Stage 2: Production
FROM node:22-alpine

WORKDIR /app

# Copy the built application from the builder stage
# Nuxt output is standalone and doesn't require node_modules
COPY --from=builder /app/.output ./.output

# Copy migrations folder
COPY --from=builder /app/server/database/migrations ./migrations

# Environment variables
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV MIGRATIONS_FOLDER=/app/migrations

# Expose the port
EXPOSE 3000

# Start the application
CMD ["node", ".output/server/index.mjs"]
