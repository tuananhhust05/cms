import { PrismaClient } from '@prisma/client';
import { ensureDatabaseInitialized } from './db-init';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Initialize database on first import (only in runtime, not build time)
if (typeof window === 'undefined' && process.env.NEXT_PHASE !== 'phase-production-build' && process.env.DATABASE_URL) {
  // Run initialization asynchronously without blocking
  ensureDatabaseInitialized().catch((error) => {
    console.error('Failed to initialize database on startup:', error.message);
  });
}

