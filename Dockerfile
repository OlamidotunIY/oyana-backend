# Base stage
FROM node:20-alpine AS base
WORKDIR /app

# Install necessary packages for Prisma
RUN apk add --no-cache openssl libc6-compat

# Dependencies stage
FROM base AS dependencies
COPY package*.json ./
# Harden npm against transient network failures in container builds.
RUN npm config set fetch-retries 5 \
  && npm config set fetch-retry-factor 2 \
  && npm config set fetch-retry-mintimeout 20000 \
  && npm config set fetch-retry-maxtimeout 120000 \
  && npm config set prefer-offline true
RUN for attempt in 1 2 3; do \
    npm ci --no-audit && break; \
    if [ "${attempt}" = "3" ]; then \
      echo "npm ci failed after 3 attempts"; \
      exit 1; \
    fi; \
    echo "npm ci failed on attempt ${attempt}, retrying..."; \
    sleep 5; \
  done

# Build stage
FROM base AS build
COPY package*.json ./
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build the application
RUN npm run build

# Verify build output
RUN ls -la dist/ && echo "Build completed successfully"

# Production stage
FROM base AS production
ENV NODE_ENV=production

# Copy dependencies and prune dev packages for runtime
COPY package*.json ./
COPY --from=dependencies /app/node_modules ./node_modules
RUN npm prune --omit=dev && npm cache clean --force

# Copy built application
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

# Copy Prisma schema for migrations
COPY prisma ./prisma
COPY prisma.config.js ./prisma.config.js
COPY tsconfig.json ./
COPY tsconfig.build.json ./

# Verify files are in place
RUN ls -la dist/ || echo "Warning: dist directory not found"

EXPOSE 3500

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3500/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/src/main.js"]
