'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  HiOutlineChartBar, 
  HiOutlineDocumentText, 
  HiOutlineFolder, 
  HiOutlineTag, 
  HiOutlineUsers 
} from 'react-icons/hi2';
import './AdminSidebar.css';

interface AdminSidebarProps {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: 'ADMIN' | 'EDITOR' | 'VIEWER';
  };
}

export default function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const menuItems = [
    { href: '/admin', label: 'Dashboard', icon: HiOutlineChartBar },
    { href: '/admin/posts', label: 'Posts', icon: HiOutlineDocumentText },
    { href: '/admin/categories', label: 'Categories', icon: HiOutlineFolder },
    { href: '/admin/tags', label: 'Tags', icon: HiOutlineTag },
  ];

  if (user.role === 'ADMIN') {
    menuItems.push({ href: '/admin/users', label: 'Users', icon: HiOutlineUsers });
  }

  return (
    <aside className="admin-sidebar">
      <div className="sidebar-header">
        <h2>CMS</h2>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }) => {
          const IconComponent = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${pathname === item.href ? 'active' : ''}`}
            >
              <IconComponent className="nav-icon" />
              <span className="nav-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-name">{user.name || user.email}</div>
          <div className="user-role">{user.role}</div>
        </div>
        <button onClick={handleLogout} className="btn-logout">
          Sign Out
        </button>
      </div>
    </aside>
  );
}

