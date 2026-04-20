import { createHmac, timingSafeEqual } from 'crypto'

export interface QRPayload {
  restaurant_id: string
  table_id: string
  timestamp: number
  signature: string
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value)
}

function isTimestampValid(timestamp: number): boolean {
  const now = Date.now()
  return timestamp > 0 && timestamp <= now && now - timestamp <= EXPIRY_MS
}

function computeSignature(
  restaurantId: string,
  tableId: string,
  timestamp: number,
  secretKey: string
): string {
  const message = `${restaurantId}:${tableId}:${timestamp}`
  return createHmac('sha256', secretKey).update(message).digest('hex')
}

function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  return timingSafeEqual(bufA, bufB)
}

/**
 * Validates a QR payload signature and timestamp.
 *
 * @param payload - The QR payload to validate
 * @param secretKey - The secret key used for HMAC verification
 * @returns Validation result with valid flag and optional error message
 */
export function validateQRPayload(
  payload: QRPayload,
  secretKey: string
): { valid: boolean; error?: string } {
  // Check for missing fields
  if (!payload.restaurant_id || !payload.table_id || payload.timestamp === undefined || !payload.signature) {
    return { valid: false, error: 'Missing required fields' }
  }

  // Validate UUID formats
  if (!isValidUUID(payload.restaurant_id)) {
    return { valid: false, error: 'Invalid restaurant_id format' }
  }

  if (!isValidUUID(payload.table_id)) {
    return { valid: false, error: 'Invalid table_id format' }
  }

  // Validate timestamp
  if (!isTimestampValid(payload.timestamp)) {
    return { valid: false, error: 'Timestamp expired or invalid' }
  }

  // Recompute signature and compare
  const computedSignature = computeSignature(
    payload.restaurant_id,
    payload.table_id,
    payload.timestamp,
    secretKey
  )

  if (!timingSafeCompare(computedSignature, payload.signature)) {
    return { valid: false, error: 'Signature mismatch' }
  }

  return { valid: true }
}
