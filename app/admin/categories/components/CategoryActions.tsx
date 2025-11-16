'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi2';

interface CategoryActionsProps {
  categoryId: string;
}

export default function CategoryActions({ categoryId }: CategoryActionsProps) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this category?')) {
      return;
    }

    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.refresh();
      } else {
        alert('Failed to delete category');
      }
    } catch (error) {
      alert('An error occurred');
    }
  };

  return (
    <div className="actions">
      <Link href={`/admin/categories/${categoryId}`} className="btn-icon" title="Edit">
        <HiOutlinePencil />
      </Link>
      <button onClick={handleDelete} className="btn-icon" title="Delete">
        <HiOutlineTrash />
      </button>
    </div>
  );
}

