import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import CategoryForm from '../components/CategoryForm';

async function getCategory(id: string) {
  const category = await prisma.category.findUnique({
    where: { id },
  });
  return category;
}

export default async function EditCategoryPage({ params }: { params: { id: string } }) {
  const category = await getCategory(params.id);

  if (!category) {
    notFound();
  }

  return (
    <div>
      <div className="admin-header">
        <h1>Edit Category</h1>
        <p className="text-secondary">Update category information</p>
      </div>
      <CategoryForm category={category} />
    </div>
  );
}

