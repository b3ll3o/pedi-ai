'use client'

import { useState, useEffect, useCallback } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { UserManagement } from '@/components/users/UserManagement'
import { StaffInviteForm } from '@/components/users/StaffInviteForm'
import { getUsers, inviteUser, deleteUser, updateUser, type UserRole } from '@/services/userService'
import type { users_profiles } from '@/lib/supabase/types'

export default function UsersPage() {
  const [users, setUsers] = useState<users_profiles[]>([])
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('owner')
  const [isLoading, setIsLoading] = useState(true)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const restaurantId = 'demo-restaurant'
        const data = await getUsers(restaurantId)
        setUsers(data)
        // In a real app, get current user's role from auth context
        setCurrentUserRole('owner')
      } catch (err) {
        console.error('Failed to load users:', err)
        setError('Erro ao carregar usuários')
      } finally {
        setIsLoading(false)
      }
    }
    loadUsers()
  }, [])

  const handleInvite = useCallback(
    async (data: { email: string; name: string; role: UserRole }) => {
      try {
        const restaurantId = 'demo-restaurant'
        await inviteUser({ ...data, restaurant_id: restaurantId })
        setShowInviteForm(false)
        // Refresh users
        const updated = await getUsers(restaurantId)
        setUsers(updated)
      } catch (err) {
        console.error('Failed to invite user:', err)
        throw err
      }
    },
    []
  )

  const handleEdit = useCallback((user: users_profiles) => {
    // Could open a modal or navigate to edit page
  }, [])

  const handleDelete = useCallback(async (userId: string) => {
    try {
      await deleteUser(userId)
      setUsers((prev) => prev.filter((u) => u.id !== userId))
    } catch (err) {
      console.error('Failed to delete user:', err)
      alert('Erro ao remover usuário')
    }
  }, [])

  if (isLoading) {
    return (
      <AdminLayout>
        <div style={{ padding: 48, textAlign: 'center', color: '#6b7280' }}>
          Carregando...
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div style={{ padding: 24 }}>
        {error && (
          <div style={{ padding: 12, marginBottom: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#991b1b' }}>
            {error}
          </div>
        )}

        <UserManagement
          users={users}
          currentUserRole={currentUserRole}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onInvite={() => setShowInviteForm(true)}
        />
      </div>

      {showInviteForm && (
        <StaffInviteForm
          onSubmit={handleInvite}
          onCancel={() => setShowInviteForm(false)}
        />
      )}
    </AdminLayout>
  )
}