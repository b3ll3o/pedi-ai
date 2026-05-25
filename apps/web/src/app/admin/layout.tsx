'use client';

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
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { RestaurantSelector } from '@/components/admin/RestaurantSelector';
import { Restaurante } from '@/domain/admin/entities/Restaurante';
import { UsuarioRestaurante } from '@/domain/admin/entities/UsuarioRestaurante';
import { ConfiguracoesRestaurante } from '@/domain/admin/value-objects/ConfiguracoesRestaurante';
import { RestauranteRepository } from '@/infrastructure/persistence/admin/RestauranteRepository';
import { UsuarioRestauranteRepository } from '@/infrastructure/persistence/admin/UsuarioRestauranteRepository';
import { db } from '@/infrastructure/persistence/database';
import { useRestaurantStore } from '@/infrastructure/persistence/restaurantStore';
import { getSession } from '@/lib/auth/client';

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
  {
    label: 'Configurações',
    href: '/admin/configuracoes',
    icon: <Settings size={20} />,
    disabled: true,
  },
];

type UserRole = 'dono' | 'gerente' | 'atendente';
type UserProfile = { restaurant_id: string; role: UserRole };

async function fetchRestaurants(): Promise<Record<string, unknown>[]> {
  const response = await fetch('/api/admin/restaurants');
  if (!response.ok) {
    console.error('Erro ao buscar restaurantes da API:', response.status);
    return [];
  }
  const data: { restaurants?: Record<string, unknown>[] } = await response.json();
  return data.restaurants ?? [];
}

async function fetchUserProfiles(): Promise<UserProfile[]> {
  try {
    const profilesRes = await fetch('/api/admin/my-profiles');
    if (profilesRes.ok) {
      const profilesData = await profilesRes.json();
      return profilesData.profiles || [];
    }
  } catch (profileError) {
    console.warn('Não foi possível buscar profiles, usando fallback:', profileError);
  }
  return [];
}

function buildRestauranteEntity(restaurantData: Record<string, unknown>) {
  return Restaurante.reconstruir({
    id: String(restaurantData.id ?? ''),
    nome: String(restaurantData.name ?? ''),
    cnpj: String(restaurantData.cnpj ?? ''),
    endereco: String(restaurantData.address ?? ''),
    telefone: restaurantData.phone ? String(restaurantData.phone) : null,
    logoUrl: restaurantData.logo_url ? String(restaurantData.logo_url) : null,
    ativo: true,
    criadoEm: restaurantData.created_at ? new Date(String(restaurantData.created_at)) : new Date(),
    atualizadoEm: restaurantData.updated_at
      ? new Date(String(restaurantData.updated_at))
      : new Date(),
    deletedAt: null,
    version: 1,
  });
}

async function syncSingleRestaurant(
  userId: string,
  restaurantData: Record<string, unknown>,
  userProfiles: UserProfile[],
  restauranteRepo: RestauranteRepository,
  usuarioRestauranteRepo: UsuarioRestauranteRepository
): Promise<void> {
  const restaurante = buildRestauranteEntity(restaurantData);
  await restauranteRepo.create(restaurante, ConfiguracoesRestaurante.criarPadrao());

  const profile = userProfiles.find((p) => p.restaurant_id === String(restaurantData.id));
  const role = profile?.role || 'dono';

  const vinculo = UsuarioRestaurante.criar({
    usuarioId: userId,
    restauranteId: String(restaurantData.id),
    papel: role,
  });
  await usuarioRestauranteRepo.save(vinculo);
}

/**
 * Sincroniza restaurantes da API para IndexedDB.
 * Garante que os dados estejam disponíveis offline e para operações locais.
 */
async function sincronizarRestaurantes(userId: string): Promise<void> {
  try {
    const restaurants = await fetchRestaurants();
    if (restaurants.length === 0) return;

    const userProfiles = await fetchUserProfiles();

    const restauranteRepo = new RestauranteRepository(db);
    const usuarioRestauranteRepo = new UsuarioRestauranteRepository(db);

    for (const restaurantData of restaurants) {
      await syncSingleRestaurant(
        userId,
        restaurantData,
        userProfiles,
        restauranteRepo,
        usuarioRestauranteRepo
      );
    }

    console.log(`Sincronizados ${restaurants.length} restaurantes para IndexedDB`);
  } catch (error) {
    console.error('Erro ao sincronizar restaurantes:', error);
  }
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const {
    restauranteSelecionado,
    restaurantesAcessiveis,
    isLoading: isStoreLoading,
    carregarRestaurantes,
    setRestaurante,
  } = useRestaurantStore();

  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (isInitialized) return;

    const init = async () => {
      try {
        const session = await getSession();
        if (!session?.user?.id) {
          setLoading(false);
          router.replace('/admin/login');
          return;
        }

        // Sincronizar restaurantes da API para IndexedDB
        await sincronizarRestaurantes(session.user.id);

        // Carregar restaurantes do usuário no store (agora disponíveis no IndexedDB)
        await carregarRestaurantes(session.user.id);
        setIsInitialized(true);
        setLoading(false);
      } catch (error) {
        console.error('Auth check failed:', error);
        setLoading(false);
        router.replace('/admin/login');
      }
    };
    init();
  }, [router, carregarRestaurantes, isInitialized]);

  // Auto-select first restaurant if none selected
  useEffect(() => {
    if (!isStoreLoading && restaurantesAcessiveis.length > 0 && !restauranteSelecionado) {
      const primeiro = restaurantesAcessiveis[0];
      const restauranteEntity = Restaurante.reconstruir(primeiro);
      setRestaurante(restauranteEntity);
    }
  }, [isStoreLoading, restaurantesAcessiveis, restauranteSelecionado, setRestaurante]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/admin/login');
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Restaurant selector callback
  const handleRestaurantChange = () => {
    // Restaurant change is handled by the selector component via store
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
      {isSidebarOpen && <div className={styles.overlay} onClick={() => setIsSidebarOpen(false)} />}

      <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <Link href="/admin" className={styles.logoLink}>
            <h1 className={styles.logo}>Pedi.ai</h1>
            <span className={styles.badge}>Admin</span>
          </Link>
        </div>

        {/* Restaurant Selector */}
        <div className={styles.restaurantSelector}>
          <RestaurantSelector onRestaurantChange={handleRestaurantChange} />
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => {
            const isActive =
              item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);

            const content = (
              <>
                <span className={styles.navIcon} aria-hidden="true">
                  {item.icon}
                </span>
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
          {restauranteSelecionado && (
            <div className={styles.activeRestaurant}>
              <Store size={16} aria-hidden="true" />
              <span>{restauranteSelecionado.nome}</span>
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
