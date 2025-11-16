import { NextRequest, NextResponse } from 'next/server';
import { authenticate, requireAuth } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { deleteCachePattern } from '@/lib/redis';
import { z } from 'zod';

const categorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await authenticate(request);
  if (authError) return authError;

  try {
    const category = await prisma.category.findUnique({
      where: { id: params.id },
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch category' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Allow VIEWER to update categories
  const authError = await requireAuth('VIEWER')(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const data = categorySchema.parse(body);

    const category = await prisma.category.update({
      where: { id: params.id },
      data,
    });

    await deleteCachePattern('categories:*');
    return NextResponse.json(category);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update category' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Only EDITOR and ADMIN can delete categories
  const authError = await requireAuth('EDITOR')(request);
  if (authError) return authError;

  try {
    await prisma.category.delete({
      where: { id: params.id },
    });

    await deleteCachePattern('categories:*');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete category' },
      { status: 500 }
    );
  }
}

