/**
 * User Service
 * Handles staff user management operations.
 */

import type { UserDTO } from '@pedi-ai/shared/types';

export type UserRole = 'dono' | 'gerente' | 'atendente' | 'cliente';

export interface UserInput {
  restaurant_id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface UserUpdate {
  name?: string;
  role?: UserRole;
  active?: boolean;
}

// ── Fetch Users ─────────────────────────────────────────────

export async function getUsers(restaurantId: string): Promise<UserDTO[]> {
  const response = await fetch(`/api/admin/users?restaurant_id=${restaurantId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch users' }));
    throw new Error(error.error || 'Failed to fetch users');
  }

  const { users } = (await response.json()) as { users: UserDTO[] };
  return users;
}

export async function getUser(userId: string): Promise<UserDTO> {
  const response = await fetch(`/api/admin/users/${userId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch user' }));
    throw new Error(error.error || 'Failed to fetch user');
  }

  const { user } = (await response.json()) as { user: UserDTO };
  return user;
}

// ── Invite User ─────────────────────────────────────────────

export interface InviteUserResult {
  invitation: {
    id: string;
    email: string;
    role: string;
    created_at: string;
  };
}

export async function inviteUser(input: UserInput): Promise<InviteUserResult> {
  const response = await fetch('/api/admin/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to invite user' }));
    throw new Error(error.error || 'Failed to invite user');
  }

  const data = (await response.json()) as { invitation?: InviteUserResult['invitation'] };
  return { invitation: data.invitation! };
}

// ── Update User ─────────────────────────────────────────────

export async function updateUser(userId: string, updates: UserUpdate): Promise<UserDTO> {
  const response = await fetch(`/api/admin/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update user' }));
    throw new Error(error.error || 'Failed to update user');
  }

  const { user } = (await response.json()) as { user: UserDTO };
  return user;
}

// ── Delete User ─────────────────────────────────────────────

export async function deleteUser(userId: string): Promise<void> {
  const response = await fetch(`/api/admin/users/${userId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete user' }));
    throw new Error(error.error || 'Failed to delete user');
  }
}

// ── Role Helpers ────────────────────────────────────────────

function isKnownRole(value: string): value is UserRole {
  return value === 'dono' || value === 'gerente' || value === 'atendente' || value === 'cliente';
}

export function canManageRole(currentRole: UserRole, targetRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    cliente: 0,
    atendente: 1,
    gerente: 2,
    dono: 3,
  };
  return roleHierarchy[currentRole] > roleHierarchy[targetRole];
}

export function getRoleLabel(role: string): string {
  if (!isKnownRole(role)) return role;
  const labels: Record<UserRole, string> = {
    dono: 'Proprietário',
    gerente: 'Gerente',
    atendente: 'Funcionário',
    cliente: 'Cliente',
  };
  return labels[role];
}

export function getRoleColor(role: string): string {
  if (!isKnownRole(role)) return '#6b7280';
  const colors: Record<UserRole, string> = {
    dono: '#dc2626',
    gerente: '#d97706',
    atendente: '#2563eb',
    cliente: '#6b7280',
  };
  return colors[role] || '#6b7280';
}
