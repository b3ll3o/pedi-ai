'use client';

import { useEffect, useState } from 'react';
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
import { useRestaurantStore } from '@/infrastructure/persistence/restaurantStore';
import { Restaurante } from '@/domain/admin/entities/Restaurante';
import { UsuarioRestaurante } from '@/domain/admin/entities/UsuarioRestaurante';
import { ConfiguracoesRestaurante } from '@/domain/admin/value-objects/ConfiguracoesRestaurante';
import { RestauranteRepository } from '@/infrastructure/persistence/admin/RestauranteRepository';
import { UsuarioRestauranteRepository } from '@/infrastructure/persistence/admin/UsuarioRestauranteRepository';
import { db } from '@/infrastructure/persistence/database';
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

/**
 * Sincroniza restaurantes do Supabase (via API) para IndexedDB.
 * Garante que os dados estejam disponíveis offline e para operações locais.
 */
async function sincronizarRestaurantes(userId: string): Promise<void> {
  try {
    // Buscar restaurantes da API (fonte: Supabase)
    const response = await fetch('/api/admin/restaurants');
    if (!response.ok) {
      console.error('Erro ao buscar restaurantes da API:', response.status);
      return;
    }

    const data = await response.json();
    const restaurants = data.restaurants || [];

    if (restaurants.length === 0) {
      return;
    }

    // Buscar profiles do usuário para obter roles (vinculos)
    // A API não retorna roles diretamente, então buscamos profiles separadamente
    // Usamos o endpoint de profile do usuário logado
    let userProfiles: Array<{ restaurant_id: string; role: 'dono' | 'gerente' | 'atendente' }> = [];
    try {
      const profilesRes = await fetch('/api/admin/my-profiles');
      if (profilesRes.ok) {
        const profilesData = await profilesRes.json();
        userProfiles = profilesData.profiles || [];
      }
    } catch (profileError) {
      console.warn('Não foi possível buscar profiles, usando dados da API:', profileError);
      // Fallback: se não conseguir buscar profiles, presumir 'dono' para todos
      userProfiles = restaurants.map((r: { id: string }) => ({
        restaurant_id: r.id,
        role: 'dono' as const,
      }));
    }

    const restauranteRepo = new RestauranteRepository(db);
    const usuarioRestauranteRepo = new UsuarioRestauranteRepository(db);

    for (const restaurantData of restaurants) {
      // Criar entidade Restaurante
      const restaurante = Restaurante.reconstruir({
        id: restaurantData.id,
        nome: restaurantData.name || '',
        cnpj: restaurantData.cnpj || '',
        endereco: restaurantData.address || '',
        telefone: restaurantData.phone || null,
        logoUrl: restaurantData.logo_url || null,
        ativo: true,
        criadoEm: restaurantData.created_at ? new Date(restaurantData.created_at) : new Date(),
        atualizadoEm: restaurantData.updated_at ? new Date(restaurantData.updated_at) : new Date(),
        deletedAt: null,
        version: 1,
      });

      // Salvar restaurante no IndexedDB
      await restauranteRepo.create(restaurante, ConfiguracoesRestaurante.criarPadrao());

      // Encontrar role do usuário para este restaurante
      const profile = userProfiles.find((p) => p.restaurant_id === restaurantData.id);
      const role = profile?.role || 'dono';

      // Criar e salvar vínculo usuário-restaurante
      const vinculo = UsuarioRestaurante.criar({
        usuarioId: userId,
        restauranteId: restaurantData.id,
        papel: role,
      });
      await usuarioRestauranteRepo.save(vinculo);
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

        // Sincronizar restaurantes do Supabase para IndexedDB
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
    await signOut();
    router.push('/admin/login');
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
        <div className={styles.restaurantSelector}>
          <RestaurantSelector onRestaurantChange={handleRestaurantChange} />
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
