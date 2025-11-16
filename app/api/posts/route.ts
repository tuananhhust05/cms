import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { deleteCachePattern } from '@/lib/redis';
import { ensureDatabaseInitialized } from '@/lib/db-init';
import { z } from 'zod';
import { execSync } from 'child_process';

const postSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  content: z.string().min(1),
  excerpt: z.string().optional().nullable(),
  featuredImage: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  categoryId: z.string().optional().nullable(),
  tagIds: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  const authError = await authenticate(request);
  if (authError) return authError;

  try {
    const posts = await prisma.post.findMany({
      include: {
        author: {
          select: {
            name: true,
            email: true,
          },
        },
        category: true,
        tags: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(posts);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = await authenticate(request);
  if (authError) return authError;

  // Ensure database is initialized (including featuredImage column)
  await ensureDatabaseInitialized();

  const user = (request as any).user;
  
  // Allow all authenticated users (VIEWER, EDITOR, ADMIN) to create posts with any status
  try {
    const body = await request.json();
    const data = postSchema.parse(body);

    // Normalize featuredImage: empty string or invalid base64 should be null
    let featuredImage = data.featuredImage;
    if (featuredImage) {
      // Remove whitespace and check if it's a valid base64 data URL
      featuredImage = featuredImage.trim();
      if (!featuredImage || featuredImage === '' || !featuredImage.startsWith('data:image/')) {
        featuredImage = null;
      }
    } else {
      featuredImage = null;
    }

    const post = await prisma.post.create({
      data: {
        title: data.title,
        slug: data.slug,
        content: data.content,
        excerpt: data.excerpt || null,
        featuredImage: featuredImage,
        status: data.status,
        categoryId: data.categoryId || null,
        authorId: user.id,
        publishedAt: data.status === 'PUBLISHED' ? new Date() : null,
        tags: {
          connect: data.tagIds?.map((id: string) => ({ id })) || [],
        },
      },
      include: {
        category: true,
        tags: true,
      },
    });

    // Clear cache
    await deleteCachePattern('posts:*');
    await deleteCachePattern('admin:stats');

    return NextResponse.json(post, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    
    // If column doesn't exist, try to add it and regenerate
    if (error.message?.includes('column') && error.message?.includes('does not exist') ||
        error.message?.includes('featuredImage')) {
      console.log('⚠ Column featuredImage does not exist, attempting to add it...');
      try {
        // Add column using raw SQL
        await prisma.$executeRaw`
          ALTER TABLE "Post" 
          ADD COLUMN IF NOT EXISTS "featuredImage" TEXT
        `;
        console.log('✓ Column featuredImage added');
        
        // Regenerate Prisma Client
        execSync('npx prisma generate', {
          stdio: 'pipe',
          cwd: process.cwd(),
          env: { ...process.env }
        });
        console.log('✓ Prisma Client regenerated');
        
        // Disconnect and reconnect
        await prisma.$disconnect();
        await prisma.$connect();
        
        return NextResponse.json(
          { 
            error: 'Database schema was updated. Please refresh the page and try again.',
            retry: true
          },
          { status: 503 }
        );
      } catch (addError: any) {
        console.error('Failed to add column:', addError.message);
        // Try db push as fallback
        try {
          execSync('npx prisma db push --accept-data-loss', {
            stdio: 'pipe',
            cwd: process.cwd(),
            env: { ...process.env }
          });
          execSync('npx prisma generate', {
            stdio: 'pipe',
            cwd: process.cwd(),
            env: { ...process.env }
          });
          await prisma.$disconnect();
          await prisma.$connect();
          
          return NextResponse.json(
            { 
              error: 'Database schema was updated. Please refresh the page and try again.',
              retry: true
            },
            { status: 503 }
          );
        } catch (pushError: any) {
          console.error('Failed to push schema:', pushError.message);
        }
      }
    }
    
    // If Prisma Client is missing a field, try to sync database and regenerate
    if (error.message?.includes('Unknown argument') || error.message?.includes('Unknown field')) {
      console.log('⚠ Prisma Client may be out of sync, attempting to sync database and regenerate...');
      try {
        // First, push schema to database
        console.log('Pushing schema to database...');
        execSync('npx prisma db push --accept-data-loss', {
          stdio: 'pipe',
          cwd: process.cwd(),
          env: { ...process.env }
        });
        console.log('✓ Database schema pushed');
        
        // Then regenerate Prisma Client
        console.log('Regenerating Prisma Client...');
        execSync('npx prisma generate', {
          stdio: 'pipe',
          cwd: process.cwd(),
          env: { ...process.env }
        });
        console.log('✓ Prisma Client regenerated');
        
        // Disconnect and reconnect to refresh Prisma Client
        await prisma.$disconnect();
        await prisma.$connect();
        
        return NextResponse.json(
          { 
            error: 'Database schema was updated. Please refresh the page and try again.',
            retry: true
          },
          { status: 503 }
        );
      } catch (syncError: any) {
        console.error('Failed to sync database and regenerate Prisma Client:', syncError.message);
        return NextResponse.json(
          { 
            error: 'Database schema needs to be updated. Please run: npx prisma db push',
            details: syncError.message
          },
          { status: 500 }
        );
      }
    }
    
    // Better error logging for Prisma errors
    console.error('Post creation error:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create post',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

