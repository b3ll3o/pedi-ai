'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard'
import { getAnalytics } from '@/services/analyticsService'
import { getSession } from '@/lib/supabase/auth'
import type { AnalyticsData } from '@/services/analyticsService'

export default function AnalyticsPage() {
  const router = useRouter()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
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
    if (!authChecked) return

    const loadAnalytics = async () => {
      setIsLoading(true)
      try {
        const restaurantId = 'demo-restaurant'
        const analyticsData = await getAnalytics({
          restaurant_id: restaurantId,
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
        <div style={{ padding: 48, textAlign: 'center', color: '#6b7280' }}>
          Carregando analytics...
        </div>
      </AdminLayout>
    )
  }

  if (!data) {
    return (
      <AdminLayout>
        <div style={{ padding: 48, textAlign: 'center' }}>
          <h2 style={{ color: '#ef4444' }}>Erro ao carregar analytics</h2>
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