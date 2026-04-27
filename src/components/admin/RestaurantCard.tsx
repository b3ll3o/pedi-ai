'use client';

import Link from 'next/link';
import { MapPin, Phone, Building2, Users } from 'lucide-react';
import type { restaurants } from '@/lib/supabase/types';
import styles from './RestaurantCard.module.css';

interface RestaurantCardProps {
  restaurant: restaurants & { team_count?: number };
  onEdit?: (restaurant: restaurants) => void;
}

export function RestaurantCard({ restaurant, onEdit }: RestaurantCardProps) {
  const isActive = true; // TODO: verificar campo status quando existir

  return (
    <article className={styles.card}>
      <header className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>{restaurant.name}</h3>
        <span className={`${styles.badge} ${isActive ? styles.badgeAtivo : styles.badgeInativo}`}>
          {isActive ? 'Ativo' : 'Inativo'}
        </span>
      </header>

      <div className={styles.cardInfo}>
        {restaurant.address && (
          <div className={styles.infoRow}>
            <MapPin aria-hidden="true" />
            <span className={styles.infoLabel}>Endereço:</span>
            <span>{restaurant.address}</span>
          </div>
        )}

        {restaurant.phone && (
          <div className={styles.infoRow}>
            <Phone aria-hidden="true" />
            <span className={styles.infoLabel}>Telefone:</span>
            <span>{restaurant.phone}</span>
          </div>
        )}

        {restaurant.description && (
          <div className={styles.infoRow}>
            <Building2 aria-hidden="true" />
            <span className={styles.infoLabel}>Descrição:</span>
            <span>{restaurant.description}</span>
          </div>
        )}
      </div>

      <footer className={styles.cardFooter}>
        {restaurant.team_count !== undefined && (
          <div className={styles.teamCount}>
            <Users aria-hidden="true" />
            <span>{restaurant.team_count} membro{restaurant.team_count !== 1 ? 's' : ''}</span>
          </div>
        )}

        <div className={styles.cardActions}>
          {onEdit && (
            <button
              type="button"
              className={`${styles.actionButton} ${styles.editButton}`}
              onClick={() => onEdit(restaurant)}
            >
              Editar
            </button>
          )}
          <Link
            href={`/admin/restaurants/${restaurant.id}/team`}
            className={`${styles.actionButton} ${styles.teamButton}`}
          >
            Equipe
          </Link>
        </div>
      </footer>
    </article>
  );
}
