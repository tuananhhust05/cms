'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi2';

interface PostActionsProps {
  postId: string;
}

export default function PostActions({ postId }: PostActionsProps) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.refresh();
      } else {
        alert('Failed to delete post');
      }
    } catch (error) {
      alert('An error occurred');
    }
  };

  return (
    <div className="actions">
      <Link href={`/admin/posts/${postId}`} className="btn-icon" title="Edit">
        <HiOutlinePencil />
      </Link>
      <button onClick={handleDelete} className="btn-icon" title="Delete">
        <HiOutlineTrash />
      </button>
    </div>
  );
}

