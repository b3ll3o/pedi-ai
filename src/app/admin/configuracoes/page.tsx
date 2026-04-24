'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSession } from '@/lib/supabase/auth'
import type { RestaurantSettings } from '@/app/api/admin/settings/route'
import styles from './page.module.css'

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState<RestaurantSettings>({
    restaurant_name: '',
    description: '',
    opening_hours: {
      open: '08:00',
      close: '22:00',
    },
    phone: '',
    address: '',
  })

  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/settings')
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Acesso negado. Apenas o proprietário pode acessar esta página.')
        }
        throw new Error('Falha ao carregar configurações')
      }
      const data = await response.json()
      setFormData(data)
    } catch (err) {
      console.error('Erro ao carregar configurações:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar configurações')
    }
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await getSession()
        if (!session) {
          router.replace('/admin/login')
          return
        }
        await fetchSettings()
        setLoading(false)
      } catch (err) {
        console.error('Auth check failed:', err)
        router.replace('/admin/login')
      }
    }
    checkAuth()
  }, [router, fetchSettings])

  const showSuccess = useCallback((message: string) => {
    setSuccess(message)
    setTimeout(() => setSuccess(null), 3000)
  }, [])

  const showError = useCallback((message: string) => {
    setError(message)
    setTimeout(() => setError(null), 5000)
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Falha ao salvar configurações')
      }

      showSuccess('Configurações salvas com sucesso!')
    } catch (err) {
      console.error('Erro ao salvar configurações:', err)
      showError(err instanceof Error ? err.message : 'Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }, [formData, showSuccess, showError])

  const handleChange = useCallback((field: keyof RestaurantSettings, value: string) => {
    setFormData((prev) => {
      if (field === 'opening_hours') {
        return {
          ...prev,
          opening_hours: {
            ...prev.opening_hours,
            open: value,
          },
        }
      }
      return { ...prev, [field]: value }
    })
  }, [])

  const handleHoursChange = useCallback((field: 'open' | 'close', value: string) => {
    setFormData((prev) => ({
      ...prev,
      opening_hours: {
        ...prev.opening_hours,
        [field]: value,
      },
    }))
  }, [])

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Carregando...</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 data-testid="page-title" className={styles.title}>
          Configurações
        </h1>
      </header>

      {success && (
        <div data-testid="success-message" className={styles.successMessage}>
          {success}
        </div>
      )}
      {error && (
        <div data-testid="error-message" className={styles.errorMessage}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formSection}>
          <h2 className={styles.sectionTitle}>Informações do Restaurante</h2>

          <div className={styles.formGroup}>
            <label htmlFor="restaurant-name">Nome do restaurante *</label>
            <input
              id="restaurant-name"
              data-testid="restaurant-name-input"
              type="text"
              value={formData.restaurant_name}
              onChange={(e) => handleChange('restaurant_name', e.target.value)}
              placeholder="Ex: Restaurante Bello"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description">Descrição</label>
            <textarea
              id="description"
              data-testid="description-input"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Breve descrição do seu restaurante"
              rows={3}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="phone">Telefone</label>
            <input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="Ex: (11) 99999-9999"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="address">Endereço</label>
            <input
              id="address"
              type="text"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Ex: Rua das Flores, 123 - Centro"
            />
          </div>
        </div>

        <div className={styles.formSection}>
          <h2 className={styles.sectionTitle}>Horário de Funcionamento</h2>

          <div className={styles.hoursRow}>
            <div className={styles.formGroup}>
              <label htmlFor="hours-open">Abertura</label>
              <input
                id="hours-open"
                type="time"
                value={formData.opening_hours.open}
                onChange={(e) => handleHoursChange('open', e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="hours-close">Fechamento</label>
              <input
                id="hours-close"
                type="time"
                value={formData.opening_hours.close}
                onChange={(e) => handleHoursChange('close', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className={styles.formActions}>
          <button
            data-testid="save-button"
            type="submit"
            className={styles.saveButton}
            disabled={saving || !formData.restaurant_name}
          >
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </form>
    </div>
  )
}