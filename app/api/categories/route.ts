import { NextRequest, NextResponse } from 'next/server';
import { authenticate, requireAuth } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { getCache, setCache, deleteCachePattern } from '@/lib/redis';
import { z } from 'zod';

const categorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  const authError = await authenticate(request);
  if (authError) return authError;

  try {
    const cacheKey = 'categories:list';
    const cached = await getCache(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const categories = await prisma.category.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    await setCache(cacheKey, categories, 3600);
    return NextResponse.json(categories);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Allow VIEWER to create categories (categories are metadata, not content)
  const authError = await requireAuth('VIEWER')(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const data = categorySchema.parse(body);

    const category = await prisma.category.create({
      data,
    });

    await deleteCachePattern('categories:*');
    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to create category' },
      { status: 500 }
    );
  }
}

