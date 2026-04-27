'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Store, AlertCircle } from 'lucide-react';
import { getSession } from '@/lib/supabase/auth';
import { RestaurantCard } from '@/components/admin/RestaurantCard';
import { ListarRestaurantesDoOwnerUseCase } from '@/application/admin/services/ListarRestaurantesDoOwnerUseCase';
import { RestauranteRepository } from '@/infrastructure/persistence/admin/RestauranteRepository';
import { UsuarioRestauranteRepository } from '@/infrastructure/persistence/admin/UsuarioRestauranteRepository';
import { db } from '@/infrastructure/persistence/database';
import { Restaurante } from '@/domain/admin/entities/Restaurante';
import styles from './page.module.css';

interface RestaurantWithTeam {
  restaurante: Restaurante;
  teamMemberCount: number;
}

export default function RestaurantsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<RestaurantWithTeam[]>([]);

  const loadRestaurants = useCallback(async () => {
    try {
      const session = await getSession();
      if (!session) {
        router.replace('/admin/login');
        return;
      }

      const restauranteRepo = new RestauranteRepository(db);
      const usuarioRestauranteRepo = new UsuarioRestauranteRepository(db);

      const listarRestaurantesUseCase = new ListarRestaurantesDoOwnerUseCase(
        restauranteRepo,
        usuarioRestauranteRepo
      );

      const resultado = await listarRestaurantesUseCase.execute({ ownerId: session.user.id });

      if (resultado.sucesso) {
        // Buscar contagem de membros para cada restaurante
        const restaurantesComTeam: RestaurantWithTeam[] = await Promise.all(
          resultado.restaurantes.map(async ({ restaurante }) => {
            try {
              const vinculos = await usuarioRestauranteRepo.findByRestauranteId(restaurante.id);
              return {
                restaurante,
                teamMemberCount: vinculos.length,
              };
            } catch {
              return {
                restaurante,
                teamMemberCount: 0,
              };
            }
          })
        );

        setRestaurants(restaurantesComTeam);
      } else {
        setError('Erro ao carregar restaurantes');
      }
    } catch (err) {
      console.error('Erro ao carregar restaurantes:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar restaurantes');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRestaurants();
  }, [loadRestaurants]);

  const handleEdit = (id: string) => {
    router.push(`/admin/restaurants/${id}/edit`);
  };

  const handleManageTeam = (id: string) => {
    router.push(`/admin/restaurants/${id}/team`);
  };

  const handleViewMenu = (id: string) => {
    router.push(`/admin/restaurants/${id}/menu`);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Meus Restaurantes</h1>
          <Link href="/admin/restaurants/new" className={styles.addButton} aria-disabled="true">
            <Plus aria-hidden="true" />
            <span>Novo Restaurante</span>
          </Link>
        </header>
        <div className={styles.grid} aria-label="Carregando restaurantes">
          {[1, 2, 3].map((i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={styles.skeletonHeader}>
                <div className={styles.skeletonTitle} />
                <div className={styles.skeletonBadge} />
              </div>
              <div className={styles.skeletonCnpj} />
              <div className={styles.skeletonAddress} />
              <div className={styles.skeletonTeam} />
              <div className={styles.skeletonActions}>
                <div className={styles.skeletonButton} />
                <div className={styles.skeletonButton} />
                <div className={styles.skeletonButton} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Meus Restaurantes</h1>
          <Link href="/admin/restaurants/new" className={styles.addButton}>
            <Plus aria-hidden="true" />
            <span>Novo Restaurante</span>
          </Link>
        </header>
        <div className={styles.error} role="alert">
          <AlertCircle aria-hidden="true" className={styles.errorIcon} />
          <h2 className={styles.errorTitle}>Erro ao carregar restaurantes</h2>
          <p className={styles.errorMessage}>{error}</p>
          <button type="button" onClick={loadRestaurants} className={styles.retryButton}>
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Meus Restaurantes</h1>
        <Link href="/admin/restaurants/new" className={styles.addButton}>
          <Plus aria-hidden="true" />
          <span>Novo Restaurante</span>
        </Link>
      </header>

      {restaurants.length === 0 ? (
        <div className={styles.empty}>
          <Store aria-hidden="true" className={styles.emptyIcon} />
          <h2 className={styles.emptyTitle}>Nenhum restaurante encontrado</h2>
          <p className={styles.emptyText}>
            Crie seu primeiro restaurante para começar a gerenciar seu negócio
          </p>
          <Link href="/admin/restaurants/new" className={styles.addButton}>
            <Plus aria-hidden="true" />
            <span>Criar Restaurante</span>
          </Link>
        </div>
      ) : (
        <section aria-labelledby="restaurants-heading">
          <h2 id="restaurants-heading" className="sr-only">
            Lista de restaurantes
          </h2>
          <div className={styles.grid}>
            {restaurants.map(({ restaurante, teamMemberCount }) => (
              <RestaurantCard
                key={restaurante.id}
                restaurante={restaurante}
                teamMemberCount={teamMemberCount}
                onEdit={handleEdit}
                onManageTeam={handleManageTeam}
                onViewMenu={handleViewMenu}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
