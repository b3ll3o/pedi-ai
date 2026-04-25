'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from '@/lib/supabase/auth';
import {
  LayoutDashboard,
  BarChart3,
  Folder,
  UtensilsCrossed,
  Armchair,
  ClipboardList,
  Settings,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import styles from './AdminLayout.module.css';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard size={20} /> },
  { label: 'Analytics', href: '/admin/analytics', icon: <BarChart3 size={20} /> },
  { label: 'Categorias', href: '/admin/categories', icon: <Folder size={20} /> },
  { label: 'Produtos', href: '/admin/products', icon: <UtensilsCrossed size={20} /> },
  { label: 'Mesas', href: '/admin/tables', icon: <Armchair size={20} /> },
  { label: 'Pedidos', href: '/admin/orders', icon: <ClipboardList size={20} /> },
  { label: 'Configurações', href: '/admin/configuracoes', icon: <Settings size={20} />, disabled: true },
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

            const content = (
              <>
                <span className={styles.navIcon} aria-hidden="true">{item.icon}</span>
                <span className={styles.navLabel}>{item.label}</span>
                {isActive && (
                  <ChevronRight size={16} className={styles.navArrow} aria-hidden="true" />
                )}
              </>
            );

            if (item.disabled) {
              return (
                <span
                  key={item.href}
                  className={`${styles.navItem} ${styles.navItemDisabled}`}
                  aria-disabled="true"
                >
                  {content}
                </span>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {content}
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
                aria-label="Sair do sistema"
              >
                <LogOut size={18} aria-hidden="true" />
                <span className={styles.logoutText}>Sair</span>
              </button>
            </div>
          </div>
        </header>

        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
