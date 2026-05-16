'use client';

import type { users_profiles, Enum_user_role } from '@/lib/supabase/types';
import { getRoleLabel, getRoleColor } from '@/application/services/userService';
import styles from './UserManagement.module.css';

interface UserManagementProps {
  users: users_profiles[];
  currentUserRole: Enum_user_role;
  onEdit: (user: users_profiles) => void;
  onDelete: (userId: string) => void;
  onInvite: () => void;
}

export function UserManagement({
  users,
  currentUserRole,
  onEdit,
  onDelete,
  onInvite,
}: UserManagementProps) {
  const canManage = (userRole: Enum_user_role) => {
    const hierarchy: Record<'dono' | 'gerente' | 'atendente' | 'cliente', number> = {
      cliente: 0,
      atendente: 1,
      gerente: 2,
      dono: 3,
    };
    return hierarchy[currentUserRole] > hierarchy[userRole];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2 className={styles.title}>Equipe</h2>
          <p className={styles.subtitle}>Gerencie os membros da equipe</p>
        </div>
        {currentUserRole === 'dono' && (
          <button type="button" className={styles.inviteButton} onClick={onInvite}>
            + Convidar Membro
          </button>
        )}
      </div>

      {users.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>👥</span>
          <p>Nenhum membro da equipe encontrado</p>
          {currentUserRole === 'dono' && (
            <button type="button" className={styles.inviteButton} onClick={onInvite}>
              Convidar primeiro membro
            </button>
          )}
        </div>
      ) : (
        <div className={styles.userList}>
          {users.map((user) => (
            <div key={user.id} className={styles.userCard}>
              <div className={styles.userAvatar}>{user.name?.charAt(0).toUpperCase() || '?'}</div>
              <div className={styles.userInfo}>
                <div className={styles.userName}>{user.name}</div>
                <div className={styles.userEmail}>{user.email}</div>
                <div className={styles.userDate}>Criado em {formatDate(user.created_at)}</div>
              </div>
              <span
                className={styles.roleBadge}
                style={{ backgroundColor: getRoleColor(user.role) }}
              >
                {getRoleLabel(user.role)}
              </span>
              {canManage(user.role) && (
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.editButton}
                    onClick={() => onEdit(user)}
                    title="Editar"
                  >
                    ✏️
                  </button>
                  {user.role !== 'dono' && (
                    <button
                      type="button"
                      className={styles.deleteButton}
                      onClick={() => {
                        if (confirm(`Remover ${user.name} da equipe?`)) {
                          onDelete(user.id);
                        }
                      }}
                      title="Remover"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
