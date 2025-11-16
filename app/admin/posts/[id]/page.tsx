import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import PostForm from '../components/PostForm';

async function getPost(id: string) {
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      category: true,
      tags: true,
    },
  });
  return post;
}

export default async function EditPostPage({ params }: { params: { id: string } }) {
  const post = await getPost(params.id);

  if (!post) {
    notFound();
  }

  return (
    <div>
      <div className="admin-header">
        <h1>Edit Post</h1>
        <p className="text-secondary">Update your blog post</p>
      </div>
      <PostForm post={post} />
    </div>
  );
}

