/**
 * Table Service
 * Handles table CRUD operations and QR code generation.
 */

import type { tables } from '@/lib/supabase/types'

export interface TableInput {
  restaurant_id: string
  number: number
  name?: string
  capacity?: number
  active?: boolean
}

export interface TableQRData {
  table_id: string
  table_number: number
  table_name: string | null
  qr_payload: {
    restaurant_id: string
    table_id: string
    timestamp: number
    signature: string
  }
  qr_data: string
}

// ── Fetch Tables ─────────────────────────────────────────────

export async function getTables(restaurantId: string): Promise<tables[]> {
  const response = await fetch(`/api/admin/tables?restaurant_id=${restaurantId}`)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch tables' }))
    /* istanbul ignore next */ throw new Error(error.error || 'Failed to fetch tables')
  }

  const { tables } = await response.json()
  return tables as tables[]
}

export async function getTable(tableId: string): Promise<tables> {
  const response = await fetch(`/api/admin/tables/${tableId}`)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch table' }))
    /* istanbul ignore next */ throw new Error(error.error || 'Failed to fetch table')
  }

  const { table } = await response.json()
  return table as tables
}

// ── Create Table ─────────────────────────────────────────────

export async function createTable(input: TableInput): Promise<tables> {
  const response = await fetch('/api/admin/tables', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create table' }))
    /* istanbul ignore next */ throw new Error(error.error || 'Failed to create table')
  }

  const { table } = await response.json()
  return table as tables
}

// ── Update Table ─────────────────────────────────────────────

export async function updateTable(
  tableId: string,
  updates: Partial<Omit<tables, 'id' | 'created_at'>>
): Promise<tables> {
  const response = await fetch(`/api/admin/tables/${tableId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update table' }))
    /* istanbul ignore next */ throw new Error(error.error || 'Failed to update table')
  }

  const { table } = await response.json()
  return table as tables
}

// ── Delete Table ─────────────────────────────────────────────

export async function deleteTable(tableId: string): Promise<void> {
  const response = await fetch(`/api/admin/tables/${tableId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json().catch(/* istanbul ignore next */ () => ({ error: 'Failed to delete table' }))
    throw new Error(error.error || 'Failed to delete table')
  }
}

// ── QR Code Generation ───────────────────────────────────────

export async function generateTableQR(tableId: string): Promise<TableQRData> {
  const response = await fetch(`/api/admin/tables/${tableId}/qr`)

  if (!response.ok) {
    const error = await response.json().catch(/* istanbul ignore next */ () => ({ error: 'Failed to generate QR code' }))
    throw new Error(error.error || 'Failed to generate QR code')
  }

  const data = await response.json()
  return {
    table_id: data.table_id,
    table_number: data.table_number,
    table_name: data.table_name,
    qr_payload: data.qr_payload,
    qr_data: data.qr_data,
  }
}

export async function validateTableQR(
  restaurantId: string,
  tableId: string,
  timestamp: number,
  signature: string
): Promise<boolean> {
  const response = await fetch(`/api/admin/tables/${tableId}/qr`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      restaurant_id: restaurantId,
      table_id: tableId,
      timestamp,
      signature,
    }),
  })

  if (!response.ok) {
    return false
  }

  try {
    const result = await response.json()
    return result.valid === true
  } catch {
    return false
  }
}
