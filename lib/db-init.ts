import { prisma } from './prisma';
import { execSync } from 'child_process';

let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

/**
 * Check if featuredImage column exists in Post table
 */
async function checkFeaturedImageColumn(): Promise<boolean> {
  try {
    // Try to query the column directly
    await prisma.$queryRaw`
      SELECT "featuredImage" FROM "Post" LIMIT 1
    `;
    return true;
  } catch (error: any) {
    if (
      error.code === '42703' || // column does not exist
      error.message?.includes('column') && error.message?.includes('does not exist') ||
      error.message?.includes('featuredImage')
    ) {
      return false;
    }
    // Other errors, assume column exists
    return true;
  }
}

/**
 * Add featuredImage column to Post table if it doesn't exist
 */
async function ensureFeaturedImageColumn() {
  const columnExists = await checkFeaturedImageColumn();
  
  if (!columnExists) {
    console.log('⚠ Column featuredImage does not exist, adding it...');
    try {
      // Add column using raw SQL
      await prisma.$executeRaw`
        ALTER TABLE "Post" 
        ADD COLUMN IF NOT EXISTS "featuredImage" TEXT
      `;
      console.log('✓ Column featuredImage added successfully');
      
      // Regenerate Prisma Client after schema change
      try {
        execSync('npx prisma generate', {
          stdio: 'pipe',
          cwd: process.cwd(),
          env: { ...process.env }
        });
        console.log('✓ Prisma Client regenerated');
        
        // Disconnect and reconnect to refresh
        await prisma.$disconnect();
        await prisma.$connect();
      } catch (genError: any) {
        console.warn('⚠ Failed to regenerate Prisma Client:', genError.message);
      }
    } catch (error: any) {
      console.error('Failed to add featuredImage column:', error.message);
      // Try db push as fallback
      try {
        console.log('Attempting db push as fallback...');
        execSync('npx prisma db push --accept-data-loss', {
          stdio: 'pipe',
          cwd: process.cwd(),
          env: { ...process.env }
        });
        console.log('✓ Database schema pushed');
        
        execSync('npx prisma generate', {
          stdio: 'pipe',
          cwd: process.cwd(),
          env: { ...process.env }
        });
        console.log('✓ Prisma Client regenerated');
        
        await prisma.$disconnect();
        await prisma.$connect();
      } catch (pushError: any) {
        console.error('Failed to push schema:', pushError.message);
      }
    }
  }
}

/**
 * Ensure Prisma Client is generated and up-to-date
 */
async function ensurePrismaClientGenerated() {
  try {
    // Try to use Prisma Client to check if it's generated
    await prisma.$connect();
    // If connection works, client is likely generated
    return;
  } catch (error: any) {
    // If connection fails, try to generate
    console.log('Prisma Client may need regeneration, attempting to generate...');
    try {
      execSync('npx prisma generate', {
        stdio: 'pipe',
        cwd: process.cwd(),
        env: { ...process.env }
      });
      console.log('✓ Prisma Client generated successfully');
      
      // Disconnect and reconnect to refresh
      await prisma.$disconnect();
      await prisma.$connect();
    } catch (genError: any) {
      console.error('Failed to generate Prisma Client:', genError.message);
      // Continue anyway, might work
    }
  }
}

// List of all tables that should exist
const REQUIRED_TABLES = ['User', 'Category', 'Tag', 'Post'];

/**
 * Check if all required tables exist in the database
 */
async function checkAllTablesExist(): Promise<boolean> {
  try {
    // Check all tables in parallel
    const checks = await Promise.all(
      REQUIRED_TABLES.map(async (tableName) => {
        try {
          await prisma.$queryRawUnsafe(`SELECT 1 FROM "${tableName}" LIMIT 1`);
          return true;
        } catch (error: any) {
          if (
            error.code === '42P01' ||
            error.message?.includes('does not exist') ||
            error.message?.includes('relation') ||
            error.message?.includes('table')
          ) {
            return false;
          }
          throw error;
        }
      })
    );
    
    // All tables must exist
    return checks.every(exists => exists);
  } catch (error: any) {
    // If any table check fails with a non-existence error, return false
    if (
      error.code === '42P01' ||
      error.message?.includes('does not exist') ||
      error.message?.includes('relation') ||
      error.message?.includes('table')
    ) {
      return false;
    }
    throw error;
  }
}

/**
 * Verify all tables exist after migration
 */
async function verifyAllTables(): Promise<boolean> {
  try {
    const allExist = await checkAllTablesExist();
    if (allExist) {
      console.log(`✓ All ${REQUIRED_TABLES.length} tables verified: ${REQUIRED_TABLES.join(', ')}`);
      return true;
    }
    return false;
  } catch (error: any) {
    console.error('Error verifying tables:', error.message);
    return false;
  }
}

export async function ensureDatabaseInitialized() {
  // If already initialized, return immediately
  if (isInitialized) {
    return;
  }

  // If initialization is in progress, wait for it
  if (initializationPromise) {
    return initializationPromise;
  }

  // Start initialization
  initializationPromise = (async () => {
    try {
      // First, ensure Prisma Client is generated
      await ensurePrismaClientGenerated();
      
      // Check if all required tables exist
      const allTablesExist = await checkAllTablesExist();
      
      // If tables exist, check for required columns (like featuredImage)
      if (allTablesExist) {
        await ensureFeaturedImageColumn();
      }
      
      if (allTablesExist) {
        isInitialized = true;
        console.log('✓ Database is already initialized with all tables');
        return;
      }
      
      // Some tables are missing, need to initialize
      console.log('⚠ Some database tables are missing. Required tables:', REQUIRED_TABLES.join(', '));
      
      // Fall through to migration logic
    } catch (error: any) {
      // If there's an error checking tables, try to initialize anyway
      console.log('Error checking tables, attempting to initialize...');
    }
    
    // Try to run migrations to create all tables
    try {
      console.log('Database tables not found. Attempting to initialize all tables...');
      
      // Try to push schema directly (for development)
      const { execSync } = require('child_process');
      
      // First try: migrate deploy (for production)
      try {
        execSync('npx prisma migrate deploy', { 
          stdio: 'pipe',
          cwd: process.cwd(),
          env: { ...process.env }
        });
        console.log('✓ Database migrations applied successfully');
        
        // Regenerate Prisma Client after migration
        try {
          execSync('npx prisma generate', { 
            stdio: 'pipe',
            cwd: process.cwd(),
            env: { ...process.env }
          });
          console.log('✓ Prisma Client regenerated');
          
          // Disconnect and reconnect to refresh Prisma Client
          await prisma.$disconnect();
          await prisma.$connect();
        } catch (genError: any) {
          console.warn('⚠ Failed to regenerate Prisma Client:', genError.message);
        }
        
        // Disconnect and reconnect to refresh connection
        await prisma.$disconnect();
        await prisma.$connect();
        
        // Verify all tables exist
        const verified = await verifyAllTables();
        if (verified) {
          isInitialized = true;
          return;
        }
        
        // If verification fails, wait and retry
        console.log('⚠ Waiting for Prisma Client to reload...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const retryVerified = await verifyAllTables();
        if (retryVerified) {
          isInitialized = true;
          return;
        }
        
        throw new Error('Database migration completed but Prisma Client needs restart. Please refresh the page.');
      } catch (deployError: any) {
        // If migrate deploy fails, try db push (for development)
        console.log('Migration deploy failed, trying db push...');
        
        try {
          execSync('npx prisma db push --accept-data-loss', { 
            stdio: 'pipe',
            cwd: process.cwd(),
            env: { ...process.env }
          });
          console.log('✓ Database schema pushed successfully');
          
          // Regenerate Prisma Client after db push
          try {
            execSync('npx prisma generate', { 
              stdio: 'pipe',
              cwd: process.cwd(),
              env: { ...process.env }
            });
            console.log('✓ Prisma Client regenerated');
            
            // Disconnect and reconnect to refresh Prisma Client
            await prisma.$disconnect();
            await prisma.$connect();
          } catch (genError: any) {
            console.warn('⚠ Failed to regenerate Prisma Client:', genError.message);
          }
          
          // Disconnect and reconnect to refresh connection
          await prisma.$disconnect();
          await prisma.$connect();
          
          // Verify all tables exist
          const verified = await verifyAllTables();
          if (verified) {
            isInitialized = true;
            return;
          }
          
          console.log('⚠ Waiting for Prisma Client to reload...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const retryVerified = await verifyAllTables();
          if (retryVerified) {
            isInitialized = true;
            return;
          }
          
          throw new Error('Database migration completed but Prisma Client needs restart. Please refresh the page.');
        } catch (pushError: any) {
          // Last resort: try migrate dev
          console.log('Db push failed, trying migrate dev...');
          execSync('npx prisma migrate dev --name init --skip-seed', { 
            stdio: 'pipe',
            cwd: process.cwd(),
            env: { ...process.env }
          });
          console.log('✓ Database migrations created and applied');
          
          // Regenerate Prisma Client after migrate dev
          try {
            execSync('npx prisma generate', { 
              stdio: 'pipe',
              cwd: process.cwd(),
              env: { ...process.env }
            });
            console.log('✓ Prisma Client regenerated');
            
            // Disconnect and reconnect to refresh Prisma Client
            await prisma.$disconnect();
            await prisma.$connect();
          } catch (genError: any) {
            console.warn('⚠ Failed to regenerate Prisma Client:', genError.message);
          }
          
          // Disconnect and reconnect to refresh connection
          await prisma.$disconnect();
          await prisma.$connect();
          
          // Verify all tables exist
          const verified = await verifyAllTables();
          if (verified) {
            isInitialized = true;
            return;
          }
          
          console.log('⚠ Waiting for Prisma Client to reload...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const retryVerified = await verifyAllTables();
          if (retryVerified) {
            isInitialized = true;
            return;
          }
          
          throw new Error('Database migration completed but Prisma Client needs restart. Please refresh the page.');
        }
      }
    } catch (migrationError: any) {
      console.error('❌ Failed to initialize database automatically');
      console.error('Please run manually: npx prisma migrate dev');
      throw new Error(
        'Database not initialized. Please run: docker-compose exec cms-next npx prisma migrate dev'
      );
    }
  })();

  return initializationPromise;
}

