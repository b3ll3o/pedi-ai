/**
 * User Service
 * Handles staff user management operations.
 */

import type { users_profiles, Enum_user_role } from '@/lib/supabase/types'

export type UserRole = Enum_user_role

export interface UserInput {
  restaurant_id: string
  email: string
  name: string
  role: UserRole
}

export interface UserUpdate {
  name?: string
  role?: UserRole
  active?: boolean
}

// ── Fetch Users ─────────────────────────────────────────────

export async function getUsers(restaurantId: string): Promise<users_profiles[]> {
  const response = await fetch(`/api/admin/users?restaurant_id=${restaurantId}`)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch users' }))
    throw new Error(error.error || 'Failed to fetch users')
  }

  const { users } = await response.json()
  return users as users_profiles[]
}

export async function getUser(userId: string): Promise<users_profiles> {
  const response = await fetch(`/api/admin/users/${userId}`)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch user' }))
    throw new Error(error.error || 'Failed to fetch user')
  }

  const { user } = await response.json()
  return user as users_profiles
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
    const error = await response.json().catch(() => ({ error: 'Failed to invite user' }))
    throw new Error(error.error || 'Failed to invite user')
  }

  const data = await response.json() as { invitation?: InviteUserResult['invitation'] };
  return { invitation: data.invitation! };
}

// ── Update User ─────────────────────────────────────────────

export async function updateUser(
  userId: string,
  updates: UserUpdate
): Promise<users_profiles> {
  const response = await fetch(`/api/admin/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update user' }))
    throw new Error(error.error || 'Failed to update user')
  }

  const { user } = await response.json()
  return user as users_profiles
}

// ── Delete User ─────────────────────────────────────────────

export async function deleteUser(userId: string): Promise<void> {
  const response = await fetch(`/api/admin/users/${userId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete user' }))
    throw new Error(error.error || 'Failed to delete user')
  }
}

// ── Role Helpers ────────────────────────────────────────────

export function canManageRole(currentRole: UserRole, targetRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    cliente: 0,
    atendente: 1,
    gerente: 2,
    dono: 3,
  }
  return roleHierarchy[currentRole] > roleHierarchy[targetRole]
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    dono: 'Proprietário',
    gerente: 'Gerente',
    atendente: 'Funcionário',
    cliente: 'Cliente',
  }
  return labels[role] || role
}

export function getRoleColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    dono: '#dc2626',
    gerente: '#d97706',
    atendente: '#2563eb',
    cliente: '#6b7280',
  }
  return colors[role] || '#6b7280'
}
