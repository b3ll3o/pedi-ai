'use client'

import { useState } from 'react'
import type { Enum_user_role } from '@/lib/supabase/types'
import styles from './StaffInviteForm.module.css'

interface StaffInviteFormProps {
  onSubmit: (data: { email: string; name: string; role: Enum_user_role }) => Promise<void>
  onCancel: () => void
}

const ROLES: Array<{ value: Enum_user_role; label: string; description: string }> = [
  {
    value: 'staff',
    label: 'Funcionário',
    description: 'Pode visualizar pedidos e atualizar status',
  },
  {
    value: 'manager',
    label: 'Gerente',
    description: 'Pode gerenciar cardápio, mesas e pedidos',
  },
  {
    value: 'owner',
    label: 'Proprietário',
    description: 'Acesso completo ao sistema',
  },
]

export function StaffInviteForm({ onSubmit, onCancel }: StaffInviteFormProps) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<Enum_user_role>('staff')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError('Email é obrigatório')
      return
    }

    if (!name.trim()) {
      setError('Nome é obrigatório')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({ email: email.trim(), name: name.trim(), role })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar convite')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>Convidar Membro</h2>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.field}>
            <label htmlFor="name" className={styles.label}>
              Nome completo
            </label>
            <input
              type="text"
              id="name"
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Maria Silva"
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>
              Email
            </label>
            <input
              type="email"
              id="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="maria@restaurante.com"
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Função</label>
            <div className={styles.roleList}>
              {ROLES.map((r) => (
                <label
                  key={r.value}
                  className={`${styles.roleOption} ${role === r.value ? styles.roleSelected : ''}`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={role === r.value}
                    onChange={() => setRole(r.value)}
                    className={styles.radioInput}
                    disabled={isSubmitting}
                  />
                  <div className={styles.roleContent}>
                    <span className={styles.roleLabel}>{r.label}</span>
                    <span className={styles.roleDescription}>{r.description}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Enviando...' : 'Enviar Convite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
