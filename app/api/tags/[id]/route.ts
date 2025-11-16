import { NextRequest, NextResponse } from 'next/server';
import { authenticate, requireAuth } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { deleteCachePattern } from '@/lib/redis';
import { z } from 'zod';

const tagSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await authenticate(request);
  if (authError) return authError;

  try {
    const tag = await prisma.tag.findUnique({
      where: { id: params.id },
    });

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    return NextResponse.json(tag);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tag' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Allow VIEWER to update tags
  const authError = await requireAuth('VIEWER')(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const data = tagSchema.parse(body);

    const tag = await prisma.tag.update({
      where: { id: params.id },
      data,
    });

    await deleteCachePattern('tags:*');
    return NextResponse.json(tag);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update tag' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Only EDITOR and ADMIN can delete tags
  const authError = await requireAuth('EDITOR')(request);
  if (authError) return authError;

  try {
    await prisma.tag.delete({
      where: { id: params.id },
    });

    await deleteCachePattern('tags:*');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete tag' },
      { status: 500 }
    );
  }
}

