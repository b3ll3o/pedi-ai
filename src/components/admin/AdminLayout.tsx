'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from '@/lib/supabase/auth';
import styles from './AdminLayout.module.css';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: '📊' },
  { label: 'Categorias', href: '/admin/categorias', icon: '📁' },
  { label: 'Produtos', href: '/admin/produtos', icon: '🍽️' },
  { label: 'Mesas', href: '/admin/mesas', icon: '🪑' },
  { label: 'Pedidos', href: '/admin/pedidos', icon: '📋' },
  { label: 'Configurações', href: '/admin/configuracoes', icon: '⚙️' },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.push('/admin/login');
  };

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h1 className={styles.logo}>Pedi.ai</h1>
          <span className={styles.badge}>Admin</span>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => {
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span className={styles.navLabel}>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className={styles.main}>
        <header className={styles.header}>
          <button className={styles.menuToggle} aria-label="Toggle menu" type="button">
            <span className={styles.menuIcon}>☰</span>
          </button>

          <div className={styles.headerContent}>
            <div className={styles.userInfo}>
              <span className={styles.userAvatar}>A</span>
              <span className={styles.userName}>Administrador</span>
              <button
                type="button"
                onClick={handleLogout}
                data-testid="admin-logout-button"
                className={styles.logoutButton}
              >
                Sair
              </button>
            </div>
          </div>
        </header>

        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
