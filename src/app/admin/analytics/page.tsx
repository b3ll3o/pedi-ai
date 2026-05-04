'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard'
import { getAnalytics } from '@/services/analyticsService'
import { getSession } from '@/lib/supabase/auth'
import { useRestaurantStore } from '@/stores/restaurantStore'
import type { AnalyticsData } from '@/services/analyticsService'

export default function AnalyticsPage() {
  const router = useRouter()
  const { restauranteSelecionado } = useRestaurantStore()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState(() => {
    const now = Date.now()
    return {
      from: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      to: new Date(now).toISOString().split('T')[0],
    }
  })
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await getSession()
        if (!session) {
          router.replace('/admin/login')
          return
        }
        setAuthChecked(true)
      } catch (error) {
        console.error('Auth check failed:', error)
        router.replace('/admin/login')
      }
    }
    checkAuth()
  }, [router])

  useEffect(() => {
    if (!authChecked || !restauranteSelecionado) return

    const loadAnalytics = async () => {
      setIsLoading(true)
      try {
        const analyticsData = await getAnalytics({
          restaurant_id: restauranteSelecionado.id,
          date_from: dateRange.from,
          date_to: dateRange.to,
        })
        setData(analyticsData)
      } catch (error) {
        console.error('Failed to load analytics:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadAnalytics()
  }, [dateRange, authChecked, restauranteSelecionado])

  if (!authChecked || isLoading) {
    return (
      <AdminLayout>
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          Carregando analytics...
        </div>
      </AdminLayout>
    )
  }

  if (!restauranteSelecionado) {
    return (
      <AdminLayout>
        <div style={{ padding: 48, textAlign: 'center' }}>
          <h2 style={{ color: 'var(--color-error)' }}>Selecione um restaurante primeiro</h2>
        </div>
      </AdminLayout>
    )
  }

  if (!data) {
    return (
      <AdminLayout>
        <div style={{ padding: 48, textAlign: 'center' }}>
          <h2 style={{ color: 'var(--color-error)' }}>Erro ao carregar analytics</h2>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <AnalyticsDashboard
        data={data}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />
    </AdminLayout>
  )
}