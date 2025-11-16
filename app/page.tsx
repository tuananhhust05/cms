import Link from 'next/link';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getCache, setCache } from '@/lib/redis';
import { ensureDatabaseInitialized } from '@/lib/db-init';
import { 
  HiOutlineDocumentText,
  HiOutlineLockClosed,
  HiOutlineBolt,
  HiOutlineSparkles,
  HiOutlineFolder,
  HiOutlineRocketLaunch,
  HiOutlineCalendar,
  HiOutlineUser
} from 'react-icons/hi2';
import './landing.css';

async function getPublishedPosts() {
  // Skip database queries during build time
  if (process.env.NEXT_PHASE === 'phase-production-build' || !process.env.DATABASE_URL) {
    return [];
  }

  // Ensure database is initialized before querying
  try {
    await ensureDatabaseInitialized();
  } catch (error: any) {
    console.error('Database initialization error:', error.message);
    // Continue anyway, might work
  }

  const cacheKey = 'posts:public:list';
  const cached = await getCache(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const posts = await prisma.post.findMany({
      where: {
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
      orderBy: {
        publishedAt: 'desc',
      },
      take: 10,
    });

    await setCache(cacheKey, posts, 300);
    return posts;
  } catch (error: any) {
    // If table doesn't exist, try to initialize and retry once
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.log('⚠ Table not found, attempting to initialize database...');
      try {
        await ensureDatabaseInitialized();
        // Retry query after initialization
        const posts = await prisma.post.findMany({
          where: {
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
          orderBy: {
            publishedAt: 'desc',
          },
          take: 10,
        });
        await setCache(cacheKey, posts, 300);
        return posts;
      } catch (retryError: any) {
        console.error('Failed to initialize database:', retryError.message);
        return [];
      }
    }
    // Other errors, return empty array
    console.error('Error fetching posts:', error.message);
    return [];
  }
}

export default async function LandingPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  const posts = await getPublishedPosts();

  // If user is logged in, show different header
  const isLoggedIn = token && verifyToken(token);

  return (
    <div className="landing-container">
      <div className="landing-hero">
        <div className="landing-content">
          <h1 className="landing-title">
            Content Management
            <br />
            <span className="gradient-text">Made Simple</span>
          </h1>
          <p className="landing-description">
            A modern, flexible CMS built with Next.js. Manage your content with ease,
            scale effortlessly, and focus on what matters most.
          </p>
          <div className="landing-actions">
            <Link href="/register" className="btn btn-primary btn-large">
              Get Started
            </Link>
            <Link href="/login" className="btn btn-secondary btn-large">
              Sign In
            </Link>
          </div>
        </div>
      </div>

      <div className="landing-features">
        <div className="container">
          <h2 className="features-title">Everything you need</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <HiOutlineDocumentText />
              </div>
              <h3>Content Management</h3>
              <p>Create, edit, and publish blog posts with an intuitive interface.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <HiOutlineLockClosed />
              </div>
              <h3>Secure Access</h3>
              <p>Role-based permissions ensure the right people have the right access.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <HiOutlineBolt />
              </div>
              <h3>Fast Performance</h3>
              <p>Optimized with Redis caching for lightning-fast responses.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <HiOutlineSparkles />
              </div>
              <h3>Beautiful Design</h3>
              <p>Clean, modern interface inspired by the best design systems.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <HiOutlineFolder />
              </div>
              <h3>Organized Content</h3>
              <p>Categories and tags help you organize and find content easily.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <HiOutlineRocketLaunch />
              </div>
              <h3>Scalable</h3>
              <p>Built with modular architecture for easy extension and growth.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Blog Posts Section */}
      {posts.length > 0 && (
        <div className="blog-posts-section">
          <div className="container">
            <h2 className="blog-section-title">Latest Posts</h2>
            <div className="blog-posts-grid">
              {posts.map((post: any) => (
                <article key={post.id} className="blog-post-card">
                  {post.featuredImage && (
                    <div className="blog-post-image">
                      <img src={post.featuredImage} alt={post.title} />
                    </div>
                  )}
                  <div className="blog-post-content">
                    {post.category && (
                      <span className="blog-post-category">{post.category.name}</span>
                    )}
                    <h3 className="blog-post-title">
                      <Link href={`/posts/${post.slug}`}>{post.title}</Link>
                    </h3>
                    {post.excerpt && (
                      <p className="blog-post-excerpt">{post.excerpt}</p>
                    )}
                    <div className="blog-post-meta">
                      <span className="blog-post-author">
                        <HiOutlineUser />
                        {post.author.name || post.author.email}
                      </span>
                      {post.publishedAt && (
                        <span className="blog-post-date">
                          <HiOutlineCalendar />
                          {new Date(post.publishedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                    {post.tags && post.tags.length > 0 && (
                      <div className="blog-post-tags">
                        {post.tags.map((tag: any) => (
                          <span key={tag.id} className="blog-tag">{tag.name}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
            {posts.length >= 10 && (
              <div style={{ textAlign: 'center', marginTop: 'var(--spacing-xl)' }}>
                <Link href="/posts" className="btn btn-secondary">
                  View All Posts
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      <footer className="landing-footer">
        <div className="container">
          <p className="text-secondary">
            © {new Date().getFullYear()} CMS. Built with Next.js and PostgreSQL.
          </p>
        </div>
      </footer>
    </div>
  );
}
