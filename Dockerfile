# Base stage
FROM node:20-alpine AS base
WORKDIR /app

# Install necessary packages for Prisma
RUN apk add --no-cache openssl libc6-compat

# Dependencies stage
FROM base AS dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
RUN cp -R node_modules /prod_node_modules
RUN npm ci

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

# Copy production dependencies
COPY --from=dependencies /prod_node_modules ./node_modules

# Copy built application
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

# Copy Prisma schema for migrations
COPY prisma ./prisma
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.build.json ./

# Verify files are in place
RUN ls -la dist/ || echo "Warning: dist directory not found"

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Change ownership of app directory
RUN chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3500

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3500/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/src/main.js"]
