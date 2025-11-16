import PostForm from '../components/PostForm';

export default function NewPostPage() {
  return (
    <div>
      <div className="admin-header">
        <h1>New Post</h1>
        <p className="text-secondary">Create a new blog post</p>
      </div>
      <PostForm />
    </div>
  );
}

