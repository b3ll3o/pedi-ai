'use client'

import { useState } from 'react'
import type { AnalyticsData } from '@/services/analyticsService'
import { formatCurrency, formatNumber, formatPercent } from '@/services/analyticsService'
import styles from './AnalyticsDashboard.module.css'

interface AnalyticsDashboardProps {
  data: AnalyticsData
  dateRange: { from: string; to: string }
  onDateRangeChange: (range: { from: string; to: string }) => void
}

export function AnalyticsDashboard({
  data,
  dateRange,
  onDateRangeChange,
}: AnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'tables'>('overview')

  const handlePresetRange = (preset: '7d' | '30d' | '90d' | 'month' | 'year') => {
    const today = new Date()
    let from: Date

    switch (preset) {
      case '7d':
        from = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        from = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        from = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        from = new Date(today.getFullYear(), today.getMonth(), 1)
        break
      case 'year':
        from = new Date(today.getFullYear(), 0, 1)
        break
    }

    onDateRangeChange({
      from: from.toISOString().split('T')[0],
      to: today.toISOString().split('T')[0],
    })
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>📊 Analytics</h1>
        <div className={styles.dateRangeSelector}>
          <button
            type="button"
            className={styles.presetBtn}
            onClick={() => handlePresetRange('7d')}
          >
            7 dias
          </button>
          <button
            type="button"
            className={styles.presetBtn}
            onClick={() => handlePresetRange('30d')}
          >
            30 dias
          </button>
          <button
            type="button"
            className={styles.presetBtn}
            onClick={() => handlePresetRange('90d')}
          >
            90 dias
          </button>
          <button
            type="button"
            className={styles.presetBtn}
            onClick={() => handlePresetRange('month')}
          >
            Este mês
          </button>
          <button
            type="button"
            className={styles.presetBtn}
            onClick={() => handlePresetRange('year')}
          >
            Este ano
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Total de Pedidos</span>
          <span className={styles.summaryValue}>{formatNumber(data.summary.total_orders)}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Receita Total</span>
          <span className={`${styles.summaryValue} ${styles.revenue}`}>
            {formatCurrency(data.summary.total_revenue)}
          </span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Ticket Médio</span>
          <span className={styles.summaryValue}>
            {formatCurrency(data.summary.average_order_value)}
          </span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Taxa de Cancelamento</span>
          <span className={`${styles.summaryValue} ${styles.cancelRate}`}>
            {formatPercent(data.summary.cancellation_rate)}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'overview' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Visão Geral
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'products' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('products')}
        >
          Produtos
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'tables' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('tables')}
        >
          Mesas
        </button>
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {activeTab === 'overview' && (
          <div className={styles.overviewGrid}>
            {/* Orders by Status */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Pedidos por Status</h3>
              <div className={styles.statusList}>
                {Object.entries(data.orders_by_status).map(([status, count]) => (
                  <div key={status} className={styles.statusRow}>
                    <span className={styles.statusName}>
                      {status === 'pending' ? 'Pendente' :
                       status === 'confirmed' ? 'Confirmado' :
                       status === 'preparing' ? 'Preparando' :
                       status === 'ready' ? 'Pronto' :
                       status === 'delivered' ? 'Entregue' : 'Cancelado'}
                    </span>
                    <span className={styles.statusCount}>{formatNumber(count)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Orders by Day */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Pedidos por Dia</h3>
              <div className={styles.chartPlaceholder}>
                <span className={styles.placeholderIcon}>📈</span>
                <span className={styles.placeholderText}>
                  {Object.keys(data.orders_by_day).length} dias com pedidos
                </span>
              </div>
            </div>

            {/* Revenue by Day */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Receita por Dia</h3>
              <div className={styles.chartPlaceholder}>
                <span className={styles.placeholderIcon}>💰</span>
                <span className={styles.placeholderText}>
                  Total: {formatCurrency(Object.values(data.revenue_by_day).reduce((a, b) => a + b, 0))}
                </span>
              </div>
            </div>

            {/* Peak Hours */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Horário de Pico</h3>
              <div className={styles.hoursList}>
                {Object.entries(data.orders_by_hour)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([hour, count]) => (
                    <div key={hour} className={styles.hourRow}>
                      <span className={styles.hourLabel}>{hour}:00</span>
                      <div className={styles.hourBar}>
                        <div
                          className={styles.hourBarFill}
                          style={{
                            width: `${(count / Math.max(...Object.values(data.orders_by_hour))) * 100}%`,
                          }}
                        />
                      </div>
                      <span className={styles.hourCount}>{formatNumber(count)}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className={styles.productsTable}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Quantidade</th>
                  <th>Receita</th>
                </tr>
              </thead>
              <tbody>
                {data.popular_items.map((item) => (
                  <tr key={item.product_id}>
                    <td>{item.product_name}</td>
                    <td>{formatNumber(item.quantity)}</td>
                    <td className={styles.revenue}>{formatCurrency(item.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.popular_items.length === 0 && (
              <p className={styles.noData}>Nenhum dado de produtos disponível</p>
            )}
          </div>
        )}

        {activeTab === 'tables' && (
          <div className={styles.productsTable}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Mesa</th>
                  <th>Pedidos</th>
                </tr>
              </thead>
              <tbody>
                {data.top_tables.map((table) => (
                  <tr key={table.table_id}>
                    <td>{table.table_name}</td>
                    <td>{formatNumber(table.order_count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.top_tables.length === 0 && (
              <p className={styles.noData}>Nenhum dado de mesas disponível</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
