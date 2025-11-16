import { prisma } from '@/lib/prisma';
import { getCache, setCache } from '@/lib/redis';

async function getUsers() {
  // Skip database queries during build time
  if (process.env.NEXT_PHASE === 'phase-production-build' || !process.env.DATABASE_URL) {
    return [];
  }

  const cacheKey = 'users:list';
  const cached = await getCache(cacheKey);
  if (cached) {
    return cached;
  }

  const users = await prisma.user.findMany({
    include: {
      _count: {
        select: {
          posts: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  await setCache(cacheKey, users, 300);
  return users;
}

export default async function UsersPage() {
  const users = await getUsers();

  const getRoleBadge = (role: string) => {
    const badges = {
      ADMIN: 'badge-published',
      EDITOR: 'badge-draft',
      VIEWER: 'badge-archived',
    };
    return badges[role as keyof typeof badges] || 'badge-draft';
  };

  return (
    <div>
      <div className="admin-header">
        <div className="flex items-center justify-between">
          <div>
            <h1>Users</h1>
            <p className="text-secondary">Manage system users</p>
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Posts</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
                  <p className="text-secondary">No users found.</p>
                </td>
              </tr>
            ) : (
              users.map((user: any) => (
                <tr key={user.id}>
                  <td><strong>{user.name || '-'}</strong></td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`badge ${getRoleBadge(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>{user._count?.posts || 0}</td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

