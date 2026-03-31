# Backend Dockerfile — Node.js + Prisma
FROM node:22-slim AS base

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# --- Dependencies stage ---
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# --- Build stage ---
FROM base AS build
COPY package.json package-lock.json* ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# --- Production stage ---
FROM base AS production
ENV NODE_ENV=production

WORKDIR /app

# Copy production deps
COPY --from=deps /app/node_modules ./node_modules
# Copy built output
COPY --from=build /app/dist ./dist
# Copy Prisma schema + generated client
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
# Copy package.json (needed by Node.js for ESM/CJS resolution)
COPY package.json ./

# Create uploads directories
RUN mkdir -p uploads/attachments uploads/avatars uploads/documents uploads/logos

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser && \
    chown -R appuser:nodejs /app
USER appuser

EXPOSE 8000

CMD ["node", "dist/server.js"]
