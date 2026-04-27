'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, getSession } from '@/lib/supabase/auth';
import {
  LayoutDashboard,
  BarChart3,
  Folder,
  UtensilsCrossed,
  Armchair,
  ClipboardList,
  Store,
  Settings,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { RestaurantSelector } from '@/components/admin/RestaurantSelector';
import { useRestaurantStore } from '@/stores/restaurantStore';
import styles from './layout.module.css';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard size={20} /> },
  { label: 'Restaurantes', href: '/admin/restaurants', icon: <Store size={20} /> },
  { label: 'Categorias', href: '/admin/categories', icon: <Folder size={20} /> },
  { label: 'Produtos', href: '/admin/products', icon: <UtensilsCrossed size={20} /> },
  { label: 'Mesas', href: '/admin/tables', icon: <Armchair size={20} /> },
  { label: 'Pedidos', href: '/admin/orders', icon: <ClipboardList size={20} /> },
  { label: 'Analytics', href: '/admin/analytics', icon: <BarChart3 size={20} />, disabled: true },
  { label: 'Configurações', href: '/admin/configuracoes', icon: <Settings size={20} />, disabled: true },
];

interface RestaurantInfo {
  id: string;
  name: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const { selectedRestaurantId, selectedRestaurantName, setRestaurante } = useRestaurantStore();

  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState<RestaurantInfo[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const fetchRestaurants = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/restaurants');
      if (res.ok) {
        const data = await res.json();
        setRestaurants(data.restaurants || []);
      }
    } catch (err) {
      console.error('Erro ao buscar restaurantes:', err);
    }
  }, []);

  useEffect(() => {
    if (isInitialized) return;

    const init = async () => {
      try {
        const session = await getSession();
        if (!session) {
          setLoading(false);
          router.replace('/admin/login');
          return;
        }

        // Fetch restaurants for selector
        await fetchRestaurants();
        setIsInitialized(true);
        setLoading(false);
      } catch (error) {
        console.error('Auth check failed:', error);
        setLoading(false);
        router.replace('/admin/login');
      }
    };
    init();
  }, [router, fetchRestaurants, isInitialized]);

  // Auto-select first restaurant if none selected
  useEffect(() => {
    if (!loading && restaurants.length > 0 && !selectedRestaurantId) {
      const first = restaurants[0];
      setRestaurante(first.id, first.name);
    }
  }, [loading, restaurants, selectedRestaurantId, setRestaurante]);

  const handleLogout = async () => {
    await signOut();
    router.push('/admin/login');
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Restaurant selector callback
  const handleRestaurantChange = (restaurant: RestaurantInfo) => {
    // Could trigger data refetch or other side effects
    console.log('Restaurant changed to:', restaurant.name);
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} />
        <span>Carregando...</span>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div className={styles.overlay} onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <Link href="/admin" className={styles.logoLink}>
            <h1 className={styles.logo}>Pedi.ai</h1>
            <span className={styles.badge}>Admin</span>
          </Link>
        </div>

        {/* Restaurant Selector */}
        {restaurants.length > 0 && (
          <div className={styles.restaurantSelector}>
            <RestaurantSelector
              restaurantes={restaurants}
              onRestaurantChange={handleRestaurantChange}
            />
          </div>
        )}

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
                onClick={() => setIsSidebarOpen(false)}
              >
                {content}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className={styles.main}>
        <header className={styles.header}>
          <button
            className={styles.menuToggle}
            onClick={toggleSidebar}
            aria-label="Toggle menu"
            type="button"
          >
            <span className={styles.menuIcon}>☰</span>
          </button>

          {/* Active restaurant indicator */}
          {selectedRestaurantName && (
            <div className={styles.activeRestaurant}>
              <Store size={16} aria-hidden="true" />
              <span>{selectedRestaurantName}</span>
            </div>
          )}

          <div className={styles.headerContent}>
            <div className={styles.userInfo}>
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
