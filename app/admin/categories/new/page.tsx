import CategoryForm from '../components/CategoryForm';

export default function NewCategoryPage() {
  return (
    <div>
      <div className="admin-header">
        <h1>New Category</h1>
        <p className="text-secondary">Create a new category</p>
      </div>
      <CategoryForm />
    </div>
  );
}

