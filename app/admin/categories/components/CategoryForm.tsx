'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import './CategoryForm.css';

interface CategoryFormProps {
  category?: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
  };
}

export default function CategoryForm({ category }: CategoryFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: category?.name || '',
    slug: category?.slug || '',
    description: category?.description || '',
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData({ ...formData, name, slug: formData.slug || generateSlug(name) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const url = category ? `/api/categories/${category.id}` : '/api/categories';
      const method = category ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          slug: formData.slug,
          description: formData.description || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Better error messages
        if (response.status === 403) {
          throw new Error('You do not have permission to create categories. Please contact an administrator.');
        }
        if (response.status === 400 && Array.isArray(data.error)) {
          throw new Error(data.error[0]?.message || 'Validation error');
        }
        throw new Error(data.error || 'Failed to save category');
      }

      router.push('/admin/categories');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="category-form">
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="name">Name *</label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={handleNameChange}
          required
          placeholder="Category name"
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
          placeholder="category-slug"
        />
        <small className="text-secondary" style={{ display: 'block', marginTop: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)' }}>
          URL-friendly version of the name
        </small>
      </div>

      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brief description of the category (optional)"
          rows={4}
        />
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={() => router.back()}>
          Cancel
        </button>
        <button type="submit" className="btn" disabled={loading}>
          {loading ? <span className="loading"></span> : category ? 'Update Category' : 'Create Category'}
        </button>
      </div>
    </form>
  );
}

