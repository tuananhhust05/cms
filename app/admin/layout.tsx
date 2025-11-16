import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyToken, getCachedUser } from '@/lib/auth';
import AdminSidebar from './components/AdminSidebar';
import './admin.css';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) {
    redirect('/login');
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    redirect('/login');
  }

  const user = await getCachedUser(decoded.id);
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="admin-layout">
      <AdminSidebar user={user} />
      <main className="admin-main">
        {children}
      </main>
    </div>
  );
}

