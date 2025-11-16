import TagForm from '../components/TagForm';

export default function NewTagPage() {
  return (
    <div>
      <div className="admin-header">
        <h1>New Tag</h1>
        <p className="text-secondary">Create a new tag</p>
      </div>
      <TagForm />
    </div>
  );
}

