import { NextRequest, NextResponse } from 'next/server';
import { authenticate, requireAuth } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { getCache, setCache, deleteCachePattern } from '@/lib/redis';
import { z } from 'zod';

const tagSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
});

export async function GET(request: NextRequest) {
  const authError = await authenticate(request);
  if (authError) return authError;

  try {
    const cacheKey = 'tags:list';
    const cached = await getCache(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const tags = await prisma.tag.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    await setCache(cacheKey, tags, 3600);
    return NextResponse.json(tags);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Allow VIEWER to create tags (tags are metadata, not content)
  const authError = await requireAuth('VIEWER')(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const data = tagSchema.parse(body);

    const tag = await prisma.tag.create({
      data,
    });

    await deleteCachePattern('tags:*');
    return NextResponse.json(tag, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to create tag' },
      { status: 500 }
    );
  }
}

