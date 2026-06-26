'use client';

import type { RestaurantDTO, UserDTO } from '@pedi-ai/shared/types';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';

import { type UserRole } from '@/application/services/userService';
import { TeamManagement } from '@/components/admin/TeamManagement';
import { Restaurante, type RestauranteProps } from '@/domain/admin/entities/Restaurante';
import { useRestaurantStore } from '@/infrastructure/persistence/restaurantStore';
import { getSession } from '@/lib/auth/client';

import styles from './page.module.css';

type ToastType = 'success' | 'error' | null;

interface TeamMembershipDTO {
  id: string;
  user_id: string;
  role: UserRole;
  user: UserDTO;
}

export default function TeamPage() {
  const router = useRouter();
  const params = useParams();
  const restaurantId = params.id as string;

  const { setRestaurante } = useRestaurantStore();

  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState<RestaurantDTO | null>(null);
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('atendente');
  const [notFound, setNotFound] = useState(false);
  const [toast, setToast] = useState<{ type: ToastType; message: string }>({
    type: null,
    message: '',
  });

  const showToast = useCallback((type: ToastType, message: string) => {
    setToast({ type, message });
    if (type) {
      setTimeout(() => setToast({ type: null, message: '' }), 4000);
    }
  }, []);

  const fetchData = useCallback(
    async (sessionUserId: string) => {
      try {
        const restaurantRes = await fetch(`/api/admin/restaurants/${restaurantId}`);
        if (restaurantRes.status === 404) {
          setNotFound(true);
          return;
        }
        if (!restaurantRes.ok) {
          throw new Error('Erro ao carregar restaurante');
        }
        const restaurantData = (await restaurantRes.json()) as { restaurant: RestaurantDTO };
        setRestaurant(restaurantData.restaurant);

        const restaurantEntity = Restaurante.reconstruir(
          restaurantData.restaurant as unknown as RestauranteProps
        );
        setRestaurante(restaurantEntity);

        const usersRes = await fetch(`/api/admin/users?restaurant_id=${restaurantId}`);
        if (!usersRes.ok) {
          throw new Error('Erro ao carregar equipe');
        }
        const usersData = (await usersRes.json()) as {
          users?: Array<TeamMembershipDTO & { user: UserDTO }>;
        };
        const userList: UserDTO[] = (usersData.users ?? []).map((m) => m.user);
        setUsers(userList);

        const currentMembership = (usersData.users ?? []).find((u) => u.user_id === sessionUserId);
        if (currentMembership) {
          setCurrentUserId(currentMembership.user_id);
          setCurrentUserRole(currentMembership.role);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao carregar dados';
        showToast('error', message);
      }
    },
    [restaurantId, setRestaurante, showToast]
  );

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await getSession();
        if (!session) {
          router.replace('/admin/login');
          return;
        }

        await fetchData(session.user.id);
        setLoading(false);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.replace('/admin/login');
      }
    };
    checkAuth();
  }, [router, fetchData]);

  const handleInvite = async (email: string, name: string, role: UserRole) => {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurant_id: restaurantId,
        email,
        name,
        role,
      }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Erro ao convidar membro');
    }

    showToast('success', 'Membro convidado com sucesso!');
    await fetchData(currentUserId);
  };

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Erro ao atualizar função');
    }

    showToast('success', 'Função atualizada com sucesso!');
    await fetchData(currentUserId);
  };

  const handleRemove = async (userId: string) => {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Erro ao remover membro');
    }

    showToast('success', 'Membro removido da equipe!');
    await fetchData(currentUserId);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Carregando...</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className={styles.container}>
        <div className={styles.notFound}>
          <h2>Restaurante não encontrado</h2>
          <p>O restaurante que você está tentando gerenciar não existe ou foi removido.</p>
          <Link href="/admin/restaurants" className={styles.backLink}>
            Voltar para Restaurantes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          Equipe
          {restaurant && <span className={styles.restaurantName}> — {restaurant.name}</span>}
        </h1>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/admin">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href="/admin/restaurants">Restaurantes</Link>
          <span aria-hidden="true">/</span>
          <Link href={`/admin/restaurants/${restaurantId}/edit`}>{restaurant?.name}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Equipe</span>
        </nav>
      </header>

      {toast.type && (
        <div
          className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}
        >
          {toast.message}
        </div>
      )}

      <main>
        <TeamManagement
          users={users}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          restaurantId={restaurantId}
          onInvite={handleInvite}
          onUpdateRole={handleUpdateRole}
          onRemove={handleRemove}
        />
      </main>

      <footer className={styles.footer}>
        <Link href={`/admin/restaurants/${restaurantId}/edit`} className={styles.backLink}>
          ← Voltar para edição do restaurante
        </Link>
      </footer>
    </div>
  );
}
