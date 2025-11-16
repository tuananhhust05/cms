import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCache, setCache, deleteCachePattern } from '@/lib/redis';
import PostActions from './components/PostActions';

async function getPosts() {
  // Skip database queries during build time
  if (process.env.NEXT_PHASE === 'phase-production-build' || !process.env.DATABASE_URL) {
    return [];
  }

  const cacheKey = 'posts:list';
  const cached = await getCache(cacheKey);
  if (cached) {
    return cached;
  }

  const posts = await prisma.post.findMany({
    include: {
      author: {
        select: {
          name: true,
          email: true,
        },
      },
      category: {
        select: {
          name: true,
        },
      },
      tags: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  await setCache(cacheKey, posts, 300);
  return posts;
}

export default async function PostsPage() {
  const posts = await getPosts();

  const getStatusBadge = (status: string) => {
    const badges = {
      DRAFT: 'badge-draft',
      PUBLISHED: 'badge-published',
      ARCHIVED: 'badge-archived',
    };
    return badges[status as keyof typeof badges] || 'badge-draft';
  };

  return (
    <div>
      <div className="admin-header">
        <div className="flex items-center justify-between">
          <div>
            <h1>Posts</h1>
            <p className="text-secondary">Manage your blog posts</p>
          </div>
          <Link href="/admin/posts/new" className="btn">
            New Post
          </Link>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Author</th>
              <th>Category</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
                  <p className="text-secondary">No posts yet. Create your first post!</p>
                </td>
              </tr>
            ) : (
              posts.map((post: any) => (
                <tr key={post.id}>
                  <td>
                    <strong>{post.title}</strong>
                    {post.excerpt && (
                      <div className="text-secondary" style={{ fontSize: 'var(--font-size-sm)', marginTop: 'var(--spacing-xs)' }}>
                        {post.excerpt.substring(0, 60)}...
                      </div>
                    )}
                  </td>
                  <td>{post.author.name || post.author.email}</td>
                  <td>{post.category?.name || '-'}</td>
                  <td>
                    <span className={`badge ${getStatusBadge(post.status)}`}>
                      {post.status}
                    </span>
                  </td>
                  <td>{new Date(post.createdAt).toLocaleDateString()}</td>
                  <td>
                    <PostActions postId={post.id} />
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

