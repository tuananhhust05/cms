import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCache, setCache } from '@/lib/redis';
import { ensureDatabaseInitialized } from '@/lib/db-init';
import { HiOutlineCalendar, HiOutlineUser, HiOutlineArrowLeft } from 'react-icons/hi2';
import './post.css';

async function getPost(slug: string) {
  // Skip database queries during build time
  if (process.env.NEXT_PHASE === 'phase-production-build' || !process.env.DATABASE_URL) {
    return null;
  }

  // Ensure database is initialized before querying
  try {
    await ensureDatabaseInitialized();
  } catch (error: any) {
    console.error('Database initialization error:', error.message);
  }

  const cacheKey = `posts:public:${slug}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const post = await prisma.post.findUnique({
      where: {
        slug,
        status: 'PUBLISHED',
      },
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
            slug: true,
          },
        },
        tags: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });

    if (post) {
      await setCache(cacheKey, post, 600); // Cache for 10 minutes
    }

    return post;
  } catch (error: any) {
    // If table doesn't exist, try to initialize and retry once
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.log('⚠ Table not found, attempting to initialize database...');
      try {
        await ensureDatabaseInitialized();
        // Retry query after initialization
        const post = await prisma.post.findUnique({
          where: {
            slug,
            status: 'PUBLISHED',
          },
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
                slug: true,
              },
            },
            tags: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
        });
        if (post) {
          await setCache(cacheKey, post, 600);
        }
        return post;
      } catch (retryError: any) {
        console.error('Failed to initialize database:', retryError.message);
        return null;
      }
    }
    // Other errors, return null
    console.error('Error fetching post:', error.message);
    return null;
  }
}

export default async function PostPage({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="post-page">
      <div className="post-container">
        <Link href="/" className="back-link">
          <HiOutlineArrowLeft />
          Back to Home
        </Link>

        <article className="post-article">
          {post.featuredImage && (
            <div className="post-featured-image">
              <img src={post.featuredImage} alt={post.title} />
            </div>
          )}

          <header className="post-header">
            {post.category && (
              <Link href={`/category/${post.category.slug}`} className="post-category">
                {post.category.name}
              </Link>
            )}
            <h1 className="post-title">{post.title}</h1>
            <div className="post-meta">
              <span className="post-author">
                <HiOutlineUser />
                {post.author.name || post.author.email}
              </span>
              {post.publishedAt && (
                <span className="post-date">
                  <HiOutlineCalendar />
                  {new Date(post.publishedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              )}
            </div>
          </header>

          {post.excerpt && (
            <p className="post-excerpt">{post.excerpt}</p>
          )}

          <div className="post-content">
            {post.content.split('\n').map((paragraph: string, index: number) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>

          {post.tags && post.tags.length > 0 && (
            <footer className="post-footer">
              <div className="post-tags">
                <span className="post-tags-label">Tags:</span>
                {post.tags.map((tag: any) => (
                  <Link key={tag.slug} href={`/tag/${tag.slug}`} className="post-tag">
                    {tag.name}
                  </Link>
                ))}
              </div>
            </footer>
          )}
        </article>
      </div>
    </div>
  );
}

