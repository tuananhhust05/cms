'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './PostForm.css';

interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  featuredImage: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  categoryId: string | null;
  tags: { id: string; name: string }[];
}

interface Category {
  id: string;
  name: string;
}

interface Tag {
  id: string;
  name: string;
}

interface PostFormProps {
  post?: Post;
}

export default function PostForm({ post }: PostFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>(post?.tags.map(t => t.id) || []);
  const [formData, setFormData] = useState({
    title: post?.title || '',
    slug: post?.slug || '',
    content: post?.content || '',
    excerpt: post?.excerpt || '',
    featuredImage: post?.featuredImage || '',
    status: post?.status || 'DRAFT',
    categoryId: post?.categoryId || null,
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function loadData() {
      const [catsRes, tagsRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/tags'),
      ]);
      const [cats, tags] = await Promise.all([
        catsRes.json(),
        tagsRes.json(),
      ]);
      setCategories(cats);
      setTags(tags);
    }
    loadData();
  }, []);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setFormData({ ...formData, title, slug: formData.slug || generateSlug(title) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = post ? `/api/posts/${post.id}` : '/api/posts';
      const method = post ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          featuredImage: formData.featuredImage && formData.featuredImage.trim() !== '' 
            ? formData.featuredImage.trim() 
            : null,
          tagIds: selectedTags,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        // Better error messages
        if (response.status === 403) {
          throw new Error(error.error || 'You do not have permission to perform this action. Please contact an administrator.');
        }
        if (response.status === 503 && error.retry) {
          // Database schema was updated, refresh and retry
          alert('Database schema was updated. Refreshing page...');
          window.location.reload();
          return;
        }
        if (response.status === 400 && Array.isArray(error.error)) {
          throw new Error(error.error[0]?.message || 'Validation error');
        }
        throw new Error(error.error || 'Failed to save post');
      }

      router.push('/admin/posts');
      router.refresh();
    } catch (error: any) {
      alert(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Only images (JPG, PNG, GIF, WebP) are allowed.');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert('File size exceeds 5MB limit. Please choose a smaller image.');
      return;
    }

    setUploading(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormData(prev => ({ ...prev, featuredImage: base64String }));
        setUploading(false);
      };
      reader.onerror = () => {
        alert('Failed to read file');
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      alert(error.message || 'Failed to process image');
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="post-form">
      {/* Basic Information Section */}
      <div className="form-section">
        <h3 className="form-section-title">Basic Information</h3>
        
        <div className="form-group">
          <label htmlFor="title">Title *</label>
          <input
            id="title"
            type="text"
            value={formData.title}
            onChange={handleTitleChange}
            required
            placeholder="Enter post title"
          />
        </div>

        <div className="form-group">
          <label htmlFor="slug">Slug *</label>
          <input
            id="slug"
            type="text"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            required
            placeholder="post-url-slug"
          />
          <small className="text-secondary" style={{ display: 'block', marginTop: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)' }}>
            URL-friendly version of the title
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="excerpt">Excerpt</label>
          <textarea
            id="excerpt"
            value={formData.excerpt}
            onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
            placeholder="Brief description of the post (optional)"
            rows={4}
          />
          <small className="text-secondary" style={{ display: 'block', marginTop: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)' }}>
            A short summary that appears in post listings
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="featuredImage">Featured Image</label>
          <input
            id="featuredImage"
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={uploading}
          />
          {uploading && (
            <p className="text-secondary" style={{ marginTop: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)' }}>
              Uploading...
            </p>
          )}
          {formData.featuredImage && (
            <div style={{ marginTop: 'var(--spacing-md)' }}>
              <img
                src={formData.featuredImage}
                alt="Featured"
                style={{
                  maxWidth: '100%',
                  maxHeight: '300px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                }}
              />
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, featuredImage: '' }))}
                className="btn btn-secondary"
                style={{ marginTop: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}
              >
                Remove Image
              </button>
            </div>
          )}
          <small className="text-secondary" style={{ display: 'block', marginTop: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)' }}>
            Upload a featured image for this post (max 5MB, JPG/PNG/GIF/WebP). Image will be stored as base64 in database.
          </small>
        </div>
      </div>

      {/* Content Section */}
      <div className="form-section">
        <h3 className="form-section-title">Content</h3>
        
        <div className="form-group">
          <label htmlFor="content">Content *</label>
          <textarea
            id="content"
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            required
            placeholder="Write your post content here..."
            rows={20}
          />
        </div>
      </div>

      {/* Metadata Section */}
      <div className="form-section">
        <h3 className="form-section-title">Metadata</h3>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="categoryId">Category</label>
            <select
              id="categoryId"
              value={formData.categoryId || ''}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value || null })}
            >
              <option value="">No category</option>
              {categories.map((cat: Category) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Tags</label>
          <div className="tags-container">
            {tags.length === 0 ? (
              <p className="text-secondary" style={{ fontSize: 'var(--font-size-sm)', margin: 0 }}>
                No tags available. Create tags first.
              </p>
            ) : (
              tags.map((tag: Tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`tag-button ${selectedTags.includes(tag.id) ? 'active' : ''}`}
                >
                  {tag.name}
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={() => router.back()}>
          Cancel
        </button>
        <button type="submit" className="btn" disabled={loading}>
          {loading ? <span className="loading"></span> : post ? 'Update Post' : 'Create Post'}
        </button>
      </div>
    </form>
  );
}

