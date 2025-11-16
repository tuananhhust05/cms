import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { execSync } from 'child_process';

export async function POST(request: NextRequest) {
  // Only ADMIN can trigger Prisma Client generation
  const authError = await requireAuth('ADMIN')(request);
  if (authError) return authError;

  try {
    console.log('Generating Prisma Client...');
    
    // Generate Prisma Client
    execSync('npx prisma generate', {
      stdio: 'pipe',
      cwd: process.cwd(),
      env: { ...process.env }
    });
    
    console.log('✓ Prisma Client generated successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Prisma Client generated successfully' 
    });
  } catch (error: any) {
    console.error('Failed to generate Prisma Client:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate Prisma Client',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

