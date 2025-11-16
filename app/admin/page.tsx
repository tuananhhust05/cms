import { prisma } from '@/lib/prisma';
import { getCache, setCache } from '@/lib/redis';

async function getStats() {
  // Skip database queries during build time
  if (process.env.NEXT_PHASE === 'phase-production-build' || !process.env.DATABASE_URL) {
    return {
      totalPosts: 0,
      publishedPosts: 0,
      categories: 0,
      tags: 0,
    };
  }

  const cacheKey = 'admin:stats';
  const cached = await getCache(cacheKey);
  if (cached) {
    return cached;
  }

  const [posts, publishedPosts, categories, tags] = await Promise.all([
    prisma.post.count(),
    prisma.post.count({ where: { status: 'PUBLISHED' } }),
    prisma.category.count(),
    prisma.tag.count(),
  ]);

  const stats = {
    totalPosts: posts,
    publishedPosts,
    categories,
    tags,
  };

  await setCache(cacheKey, stats, 300); // Cache for 5 minutes
  return stats;
}

export default async function AdminDashboard() {
  const stats = await getStats();

  return (
    <div>
      <div className="admin-header">
        <h1>Dashboard</h1>
        <p className="text-secondary">Welcome to your content management system</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Posts</h3>
          <div className="stat-value">{stats.totalPosts}</div>
        </div>
        <div className="stat-card">
          <h3>Published Posts</h3>
          <div className="stat-value">{stats.publishedPosts}</div>
        </div>
        <div className="stat-card">
          <h3>Categories</h3>
          <div className="stat-value">{stats.categories}</div>
        </div>
        <div className="stat-card">
          <h3>Tags</h3>
          <div className="stat-value">{stats.tags}</div>
        </div>
      </div>
    </div>
  );
}

