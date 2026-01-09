# Stage 1: Build
FROM node:22-alpine AS builder

# Install build dependencies for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the Nuxt application
RUN npm run build

# Stage 2: Production
FROM node:22-alpine

# Install dependencies for native modules (better-sqlite3)
# We need these in the final image if we are rebuilding modules or if the binary was linked dynamically
# better-sqlite3 is simpler to just reinstall in the final stage to ensure correct bindings
# However, usually copying from builder works if the OS matches.
# Let's try to keep it slim. If better-sqlite3 fails, we might need libstdc++ or similar.
# Reinstalling production dependencies is safer for native modules.
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files for production install
COPY package.json package-lock.json ./

# Install only production dependencies
# This ensures better-sqlite3 is compiled for this specific environment
RUN npm ci --omit=dev && npm cache clean --force

# Copy the built application from the builder stage
COPY --from=builder /app/.output ./.output

# Copy migrations folder
COPY --from=builder /app/server/database/migrations ./migrations

# Remove build tools to keep the image smaller (optional but recommended)
# Note: removing g++ might break if better-sqlite3 needs shared libs, but usually it's fine.
# Let's clean up.
RUN apk del python3 make g++

# Environment variables
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV DB_PATH=/data/db.sqlite
ENV MIGRATIONS_FOLDER=/app/migrations

# Expose the port
EXPOSE 3000

# Create a volume for the database
VOLUME ["/data"]

# Start the application
CMD ["node", ".output/server/index.mjs"]
