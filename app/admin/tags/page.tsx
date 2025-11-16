import { prisma } from '@/lib/prisma';
import { getCache, setCache } from '@/lib/redis';
import Link from 'next/link';
import TagActions from './components/TagActions';

async function getTags() {
  // Skip database queries during build time
  if (process.env.NEXT_PHASE === 'phase-production-build' || !process.env.DATABASE_URL) {
    return [];
  }

  const cacheKey = 'tags:list';
  const cached = await getCache(cacheKey);
  if (cached) {
    return cached;
  }

  const tags = await prisma.tag.findMany({
    include: {
      _count: {
        select: {
          posts: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  await setCache(cacheKey, tags, 3600);
  return tags;
}

export default async function TagsPage() {
  const tags = await getTags();

  return (
    <div>
      <div className="admin-header">
        <div className="flex items-center justify-between">
          <div>
            <h1>Tags</h1>
            <p className="text-secondary">Manage post tags</p>
          </div>
          <Link href="/admin/tags/new" className="btn">
            New Tag
          </Link>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Posts</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tags.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
                  <p className="text-secondary">No tags yet.</p>
                </td>
              </tr>
            ) : (
              tags.map((tag: any) => (
                <tr key={tag.id}>
                  <td><strong>{tag.name}</strong></td>
                  <td className="text-secondary">{tag.slug}</td>
                  <td>{tag._count?.posts || 0}</td>
                  <td>
                    <TagActions tagId={tag.id} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

