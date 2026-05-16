'use client';

import { MapPin, Users, Pencil, UserCog, Utensils } from 'lucide-react';
import { Restaurante } from '@/domain/admin/entities/Restaurante';
import styles from './RestaurantCard.module.css';

interface RestaurantCardProps {
  restaurante: Restaurante;
  teamMemberCount?: number;
  onEdit: (id: string) => void;
  onManageTeam: (id: string) => void;
  onViewMenu?: (id: string) => void;
}

/**
 * Formata CNPJ no padrão XX.XXX.XXX/XXXX-XX
 */
function formatarCNPJ(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return cnpj;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

export function RestaurantCard({
  restaurante,
  teamMemberCount,
  onEdit,
  onManageTeam,
  onViewMenu,
}: RestaurantCardProps) {
  return (
    <article className={styles.card}>
      <header className={styles.cardHeader}>
        <div className={styles.titleRow}>
          <h3 className={styles.cardTitle}>{restaurante.nome}</h3>
          <span
            className={`${styles.badge} ${restaurante.ativo ? styles.badgeAtivo : styles.badgeInativo}`}
            role="status"
            aria-label={restaurante.ativo ? 'Restaurante ativo' : 'Restaurante inativo'}
          >
            {restaurante.ativo ? 'Ativo' : 'Inativo'}
          </span>
        </div>

        <div className={styles.cnpjRow}>
          <span className={styles.cnpjLabel}>CNPJ:</span>
          <span className={styles.cnpjValue}>{formatarCNPJ(restaurante.cnpj)}</span>
        </div>
      </header>

      <div className={styles.cardInfo}>
        {restaurante.endereco && (
          <div className={styles.infoRow}>
            <MapPin aria-hidden="true" className={styles.icon} />
            <span>{restaurante.endereco}</span>
          </div>
        )}
      </div>

      {teamMemberCount !== undefined && (
        <div className={styles.teamCount} aria-label={`${teamMemberCount} membros na equipe`}>
          <Users aria-hidden="true" className={styles.icon} />
          <span>
            {teamMemberCount} membro{teamMemberCount !== 1 ? 's' : ''} na equipe
          </span>
        </div>
      )}

      <footer className={styles.cardFooter}>
        <div className={styles.cardActions}>
          <button
            type="button"
            className={`${styles.actionButton} ${styles.editButton}`}
            onClick={() => onEdit(restaurante.id)}
            aria-label={`Editar ${restaurante.nome}`}
          >
            <Pencil aria-hidden="true" />
            <span>Editar</span>
          </button>

          <button
            type="button"
            className={`${styles.actionButton} ${styles.teamButton}`}
            onClick={() => onManageTeam(restaurante.id)}
            aria-label={`Gerenciar equipe de ${restaurante.nome}`}
          >
            <UserCog aria-hidden="true" />
            <span>Equipe</span>
          </button>

          {onViewMenu && (
            <button
              type="button"
              className={`${styles.actionButton} ${styles.menuButton}`}
              onClick={() => onViewMenu(restaurante.id)}
              aria-label={`Ver cardápio de ${restaurante.nome}`}
            >
              <Utensils aria-hidden="true" />
              <span>Cardápio</span>
            </button>
          )}
        </div>
      </footer>
    </article>
  );
}
