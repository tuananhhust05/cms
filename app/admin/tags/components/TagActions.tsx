'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi2';

interface TagActionsProps {
  tagId: string;
}

export default function TagActions({ tagId }: TagActionsProps) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this tag?')) {
      return;
    }

    try {
      const response = await fetch(`/api/tags/${tagId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete tag');
      }
    } catch (error) {
      alert('An error occurred');
    }
  };

  return (
    <div className="actions">
      <Link href={`/admin/tags/${tagId}`} className="btn-icon" title="Edit">
        <HiOutlinePencil />
      </Link>
      <button onClick={handleDelete} className="btn-icon" title="Delete">
        <HiOutlineTrash />
      </button>
    </div>
  );
}

