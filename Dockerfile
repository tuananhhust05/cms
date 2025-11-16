FROM node:22-slim

WORKDIR /app

# Install OpenSSL and other dependencies for Prisma
# Using Debian-based image for better Prisma compatibility
RUN apt-get update && apt-get install -y \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies for better caching
COPY package.json package-lock.json* ./
RUN npm i

# Copy Prisma schema
COPY prisma ./prisma

# Set Prisma binary target for Debian Linux
ENV PRISMA_CLI_BINARY_TARGETS=debian-openssl-3.0.x

# Generate Prisma Client
RUN npx prisma generate

# Copy application code needed for build
COPY app ./app
COPY lib ./lib
COPY public ./public
COPY next.config.js ./
COPY tsconfig.json ./
COPY next-env.d.ts ./

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Start in dev mode with hot reload
# Use --turbo for faster builds in development
CMD ["npm", "start"]

