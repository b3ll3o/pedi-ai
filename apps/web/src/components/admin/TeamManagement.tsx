'use client';

import type { UserDTO } from '@pedi-ai/shared/types';
import { useState } from 'react';

import { getRoleLabel, getRoleColor, type UserRole } from '@/application/services/userService';

import styles from './TeamManagement.module.css';

interface TeamManagementProps {
  users: UserDTO[];
  currentUserId: string;
  currentUserRole: UserRole;
  restaurantId: string;
  onInvite: (email: string, name: string, role: UserRole) => Promise<void>;
  onUpdateRole: (userId: string, newRole: UserRole) => Promise<void>;
  onRemove: (userId: string) => Promise<void>;
}

export function TeamManagement({
  users,
  currentUserId,
  currentUserRole,
  restaurantId: _restaurantId,
  onInvite,
  onUpdateRole,
  onRemove,
}: TeamManagementProps) {
  const [searchEmail, setSearchEmail] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New member form
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<UserRole>('atendente');

  // Editing state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<UserRole | null>(null);

  const canManage = (userRole: string): boolean => {
    const hierarchy: Record<UserRole, number> = {
      cliente: 0,
      atendente: 1,
      gerente: 2,
      dono: 3,
    };
    if (!(currentUserRole in hierarchy) || !(userRole in hierarchy)) return false;
    return hierarchy[currentUserRole] > hierarchy[userRole as UserRole];
  };

  const canEditRole = (userRole: string): boolean => {
    return userRole !== 'dono' && canManage(userRole);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchEmail.toLowerCase()) ||
      user.name.toLowerCase().includes(searchEmail.toLowerCase())
  );

  const handleOpenModal = () => {
    setNewMemberName('');
    setNewMemberEmail('');
    setNewMemberRole('atendente');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setNewMemberName('');
    setNewMemberEmail('');
    setNewMemberRole('atendente');
  };

  const handleInvite = async () => {
    if (!newMemberName.trim() || !newMemberEmail.trim()) return;

    setIsSubmitting(true);
    try {
      await onInvite(newMemberEmail.trim(), newMemberName.trim(), newMemberRole);
      handleCloseModal();
    } catch {
      // Error handled by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveRole = async (userId: string) => {
    if (!editingRole) return;

    setIsSubmitting(true);
    try {
      await onUpdateRole(userId, editingRole);
      setEditingUserId(null);
      setEditingRole(null);
    } catch {
      // Error handled by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditingRole(null);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2 className={styles.title}>Equipe</h2>
          <p className={styles.subtitle}>Gerencie os membros da equipe deste restaurante</p>
        </div>
        {currentUserRole === 'dono' && (
          <button type="button" className={styles.inviteButton} onClick={handleOpenModal}>
            + Convidar Membro
          </button>
        )}
      </div>

      {/* Search */}
      {users.length > 0 && (
        <div className={styles.searchSection}>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Buscar por nome ou email..."
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            aria-label="Buscar membros da equipe"
          />
        </div>
      )}

      {filteredUsers.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>👥</span>
          <p>
            {searchEmail
              ? 'Nenhum membro encontrado para a busca'
              : 'Nenhum membro da equipe encontrado'}
          </p>
          {currentUserRole === 'dono' && !searchEmail && (
            <button type="button" className={styles.inviteButton} onClick={handleOpenModal}>
              Convidar primeiro membro
            </button>
          )}
        </div>
      ) : (
        <div className={styles.userList}>
          {filteredUsers.map((user) => (
            <div key={user.id} className={styles.userCard}>
              <div className={styles.userAvatar}>{user.name?.charAt(0).toUpperCase() || '?'}</div>
              <div className={styles.userInfo}>
                <div className={styles.userName}>
                  {user.name}
                  {user.id === currentUserId && (
                    <span className={styles.currentUserBadge}>Você</span>
                  )}
                </div>
                <div className={styles.userEmail}>{user.email}</div>
                <div className={styles.userDate}>Desde {formatDate(user.created_at)}</div>
              </div>

              {/* Role display or edit */}
              {editingUserId === user.id ? (
                <select
                  className={styles.roleSelect}
                  value={editingRole ?? user.role}
                  onChange={(e) => setEditingRole(e.target.value as UserRole)}
                  disabled={isSubmitting}
                >
                  <option value="atendente">Funcionário</option>
                  <option value="gerente">Gerente</option>
                  {user.role === 'dono' && <option value="dono">Proprietário</option>}
                </select>
              ) : (
                <span
                  className={`${styles.roleBadge} ${styles[user.role]}`}
                  style={{ backgroundColor: getRoleColor(user.role) }}
                >
                  {getRoleLabel(user.role)}
                </span>
              )}

              {/* Actions */}
              <div className={styles.actions}>
                {editingUserId === user.id ? (
                  <>
                    <button
                      type="button"
                      className={styles.editButton}
                      onClick={() => handleSaveRole(user.id)}
                      disabled={isSubmitting}
                      title="Salvar"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      className={styles.deleteButton}
                      onClick={handleCancelEdit}
                      disabled={isSubmitting}
                      title="Cancelar"
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <>
                    {canEditRole(user.role) && (
                      <button
                        type="button"
                        className={styles.editButton}
                        onClick={() => {
                          setEditingUserId(user.id);
                          setEditingRole(user.role as UserRole);
                        }}
                        title="Editar função"
                      >
                        ✏️
                      </button>
                    )}
                    {user.role !== 'dono' ? (
                      user.id !== currentUserId ? (
                        <button
                          type="button"
                          className={styles.deleteButton}
                          onClick={() => {
                            if (confirm(`Remover ${user.name} da equipe?`)) {
                              onRemove(user.id);
                            }
                          }}
                          disabled={!canManage(user.role)}
                          title={canManage(user.role) ? 'Remover' : 'Sem permissão'}
                        >
                          🗑️
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={styles.deleteButton}
                          disabled
                          title="Você não pode se remover"
                        >
                          🗑️
                        </button>
                      )
                    ) : (
                      <button
                        type="button"
                        className={styles.deleteButton}
                        disabled
                        title="Proprietário não pode ser removido"
                      >
                        🗑️
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invite Modal */}
      {isModalOpen && (
        <div className={styles.modal} role="dialog" aria-modal="true">
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>Convidar Novo Membro</h3>

            <div className={styles.formGroup}>
              <label htmlFor="member-name">Nome</label>
              <input
                id="member-name"
                type="text"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="Nome completo"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="member-email">E-mail</label>
              <input
                id="member-email"
                type="email"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="member-role">Função</label>
              <select
                id="member-role"
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value as UserRole)}
              >
                <option value="atendente">Funcionário</option>
                <option value="gerente">Gerente</option>
              </select>
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={handleCloseModal}
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.confirmButton}
                onClick={handleInvite}
                disabled={isSubmitting || !newMemberName.trim() || !newMemberEmail.trim()}
              >
                {isSubmitting ? 'Enviando...' : 'Enviar convite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
