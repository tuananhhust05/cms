import { prisma } from '@/lib/prisma';
import { getCache, setCache } from '@/lib/redis';
import Link from 'next/link';
import CategoryActions from './components/CategoryActions';

async function getCategories() {
  // Skip database queries during build time
  if (process.env.NEXT_PHASE === 'phase-production-build' || !process.env.DATABASE_URL) {
    return [];
  }

  const cacheKey = 'categories:list';
  const cached = await getCache(cacheKey);
  if (cached) {
    return cached;
  }

  const categories = await prisma.category.findMany({
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

  await setCache(cacheKey, categories, 3600);
  return categories;
}

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div>
      <div className="admin-header">
        <div className="flex items-center justify-between">
          <div>
            <h1>Categories</h1>
            <p className="text-secondary">Manage post categories</p>
          </div>
          <Link href="/admin/categories/new" className="btn">
            New Category
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
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
                  <p className="text-secondary">No categories yet.</p>
                </td>
              </tr>
            ) : (
              categories.map((category: any) => (
                <tr key={category.id}>
                  <td><strong>{category.name}</strong></td>
                  <td className="text-secondary">{category.slug}</td>
                  <td>{category._count?.posts || 0}</td>
                  <td className="text-secondary">{category.description || '-'}</td>
                  <td>
                    <CategoryActions categoryId={category.id} />
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

