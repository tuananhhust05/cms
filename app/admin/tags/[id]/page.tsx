import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import TagForm from '../components/TagForm';

async function getTag(id: string) {
  const tag = await prisma.tag.findUnique({
    where: { id },
  });
  return tag;
}

export default async function EditTagPage({ params }: { params: { id: string } }) {
  const tag = await getTag(params.id);

  if (!tag) {
    notFound();
  }

  return (
    <div>
      <div className="admin-header">
        <h1>Edit Tag</h1>
        <p className="text-secondary">Update tag information</p>
      </div>
      <TagForm tag={tag} />
    </div>
  );
}

