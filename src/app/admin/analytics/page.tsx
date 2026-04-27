'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard'
import { getAnalytics } from '@/services/analyticsService'
import { requireAuth } from '@/lib/auth/client-admin'
import type { AnalyticsData } from '@/services/analyticsService'

export default function AnalyticsPage() {
  const router = useRouter()
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
        await requireAuth()
        setAuthChecked(true)
      } catch (error) {
        console.error('Auth check failed:', error)
        router.replace('/admin/login')
      }
    }
    checkAuth()
  }, [router])

  useEffect(() => {
    if (!authChecked) return

    const loadAnalytics = async () => {
      setIsLoading(true)
      try {
        const authUser = await requireAuth()
        const analyticsData = await getAnalytics({
          restaurant_id: authUser.restaurant_id,
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
  }, [dateRange, authChecked])

  if (!authChecked || isLoading) {
    return (
      <AdminLayout>
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          Carregando analytics...
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