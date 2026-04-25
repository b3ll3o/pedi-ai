'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { UserManagement } from '@/components/admin/UserManagement'
import { UserForm } from '@/components/admin/UserForm'
import { getUsers, inviteUser, deleteUser, updateUser, type UserRole } from '@/services/userService'
import { requireAuth } from '@/lib/auth/admin'
import type { users_profiles } from '@/lib/supabase/types'

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<users_profiles[]>([])
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('owner')
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<users_profiles | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [authUser, setAuthUser] = useState<Awaited<ReturnType<typeof requireAuth>> | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await requireAuth()
        setAuthUser(user)
        setAuthChecked(true)
      } catch (error) {
        console.error('Auth check failed:', error)
        router.replace('/admin/login')
      }
    }
    checkAuth()
  }, [router])

  useEffect(() => {
    if (!authChecked || !authUser) return

    const loadUsers = async () => {
      try {
        const data = await getUsers(authUser.restaurant_id)
        setUsers(data)
        setCurrentUserRole(authUser.role as UserRole)
      } catch (err) {
        console.error('Failed to load users:', err)
        setError('Erro ao carregar usuários')
      } finally {
        setIsLoading(false)
      }
    }
    loadUsers()
  }, [authChecked, authUser])

  const handleInvite = useCallback(
    async (data: { email: string; name: string; role: UserRole }) => {
      if (!authUser) return
      try {
        await inviteUser({ ...data, restaurant_id: authUser.restaurant_id })
        setShowForm(false)
        const updated = await getUsers(authUser.restaurant_id)
        setUsers(updated)
      } catch (err) {
        console.error('Failed to invite user:', err)
        throw err
      }
    },
    [authUser]
  )

  const handleUpdate = useCallback(
    async (data: { email: string; name: string; role: UserRole }) => {
      if (!editingUser) return
      try {
        await updateUser(editingUser.id, { name: data.name, role: data.role })
        setShowForm(false)
        setEditingUser(null)
        if (authUser) {
          const updated = await getUsers(authUser.restaurant_id)
          setUsers(updated)
        }
      } catch (err) {
        console.error('Failed to update user:', err)
        throw err
      }
    },
    [editingUser, authUser]
  )

  const handleEdit = useCallback((user: users_profiles) => {
    setEditingUser(user)
    setShowForm(true)
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

  const handleCloseForm = useCallback(() => {
    setShowForm(false)
    setEditingUser(null)
  }, [])

  // Role protection: only owner can manage users
  if (authChecked && authUser && authUser.role !== 'owner') {
    return (
      <AdminLayout>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '3rem',
          textAlign: 'center',
        }}>
          <span style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</span>
          <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text-primary)' }}>Acesso Negado</h2>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
            Apenas o proprietário pode gerenciar usuários.
          </p>
        </div>
      </AdminLayout>
    )
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          Carregando...
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div style={{ padding: 24 }}>
        {error && (
          <div style={{
            padding: 12,
            marginBottom: 16,
            background: 'var(--color-error-light)',
            border: '1px solid var(--color-error)',
            borderRadius: 6,
            color: 'var(--color-error-dark)'
          }}>
            {error}
          </div>
        )}

        <UserManagement
          users={users}
          currentUserRole={currentUserRole}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onInvite={() => setShowForm(true)}
        />
      </div>

      {showForm && (
        <UserForm
          user={editingUser || undefined}
          onSubmit={editingUser ? handleUpdate : handleInvite}
          onCancel={handleCloseForm}
        />
      )}
    </AdminLayout>
  )
}