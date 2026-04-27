'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/supabase/auth';
import { RestaurantForm, type RestaurantFormData } from '@/components/admin/RestaurantForm';
import type { restaurants } from '@/lib/supabase/types';
import styles from './page.module.css';

export default function EditRestaurantPage() {
  const router = useRouter();
  const params = useParams();
  const restaurantId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [_submitting, setSubmitting] = useState(false);
  const [restaurant, setRestaurant] = useState<restaurants | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadRestaurant = async () => {
      try {
        const session = await getSession();
        if (!session) {
          router.replace('/admin/login');
          return;
        }

        const res = await fetch(`/api/admin/restaurants/${restaurantId}`);
        if (res.status === 404) {
          if (!cancelled) {
            setNotFound(true);
            setLoading(false);
          }
          return;
        }

        if (res.status === 401) {
          router.replace('/admin/login');
          return;
        }

        if (res.status === 403) {
          if (!cancelled) {
            setError('Você não tem permissão para acessar este restaurante.');
            setLoading(false);
          }
          return;
        }

        if (!res.ok) {
          throw new Error('Erro ao carregar restaurante');
        }

        const data = await res.json();
        if (!cancelled) {
          setRestaurant(data.restaurant);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Erro ao carregar restaurante:', err);
          setError(err instanceof Error ? err.message : 'Erro ao carregar restaurante');
          setLoading(false);
        }
      }
    };

    loadRestaurant();

    return () => {
      cancelled = true;
    };
  }, [router, restaurantId]);

  const handleSubmit = async (data: RestaurantFormData) => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/restaurants/${restaurantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.nome,
          address: data.endereco,
          phone: data.telefone,
          logo_url: data.logoUrl,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao atualizar restaurante');
      }

      router.push('/admin/restaurants');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar restaurante';
      setError(message);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!confirm('Tem certeza que deseja desativar este restaurante? Ele não aparecerá para os clientes, mas os dados serão mantidos.')) {
      return;
    }

    setDeactivating(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/restaurants/${restaurantId}/deactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao desativar restaurante');
      }

      router.push('/admin/restaurants');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao desativar restaurante';
      setError(message);
    } finally {
      setDeactivating(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin/restaurants');
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading} role="status" aria-live="polite">
          Carregando...
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className={styles.container}>
        <div className={styles.notFound}>
          <h2>Restaurante não encontrado</h2>
          <p>O restaurante que você está tentando editar não existe ou foi removido.</p>
          <Link href="/admin/restaurants" className={styles.backLink}>
            Voltar para Restaurantes
          </Link>
        </div>
      </div>
    );
  }

  const initialData: RestaurantFormData | undefined = restaurant
    ? {
        nome: restaurant.name,
        cnpj: '', // CNPJ não é exibido/editable no modo edição
        endereco: restaurant.address ?? '',
        telefone: restaurant.phone ?? '',
        logoUrl: restaurant.logo_url ?? '',
      }
    : undefined;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          Editar Restaurante
          {restaurant && <span className={styles.restaurantName}> — {restaurant.name}</span>}
        </h1>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/admin">Admin</Link>
          <span aria-hidden="true">/</span>
          <Link href="/admin/restaurants">Restaurantes</Link>
          <span aria-hidden="true">/</span>
          <span>{restaurant?.name || 'Editar'}</span>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Editar</span>
        </nav>
      </header>

      <main>
        {error && (
          <div className={styles.errorBanner} role="alert">
            {error}
          </div>
        )}

        {restaurant && (
          <RestaurantForm
            mode="edit"
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        )}

        {restaurant && (
          <div className={styles.dangerZone}>
            <h3 className={styles.dangerTitle}>Zona de Perigo</h3>
            <p className={styles.dangerDescription}>
              Desativar o restaurante fará com que ele não apareça mais para os clientes.
              Os dados serão mantidos para fins históricos.
            </p>
            <button
              type="button"
              className={styles.dangerButton}
              onClick={handleDeactivate}
              disabled={deactivating}
              aria-busy={deactivating}
            >
              {deactivating ? 'Desativando...' : 'Desativar Restaurante'}
            </button>
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <Link href="/admin/restaurants" className={styles.backLink}>
          ← Voltar para listagem
        </Link>
      </footer>
    </div>
  );
}