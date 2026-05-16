import { createHmac, timingSafeEqual } from 'crypto';

export interface QRPayload {
  restaurant_id: string;
  table_id: string;
  timestamp: number;
  nonce?: string;
  expiry?: number;
  signature: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NONCE_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const QR_EXPIRY_MS = 4 * 60 * 60 * 1000; // 4 hours
const LEGACY_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000; // 24 hours for legacy QR codes

function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

function isValidNonce(nonce: string | undefined): boolean {
  if (!nonce) return false;
  return NONCE_REGEX.test(nonce);
}

function isTimestampValid(timestamp: number, hasNonce: boolean): boolean {
  const now = Date.now();
  const expiryMs = hasNonce ? QR_EXPIRY_MS : LEGACY_GRACE_PERIOD_MS;
  return timestamp > 0 && timestamp <= now && now - timestamp <= expiryMs;
}

function computeSignature(
  restaurantId: string,
  tableId: string,
  timestamp: number,
  nonce: string | undefined,
  secretKey: string
): string {
  const message = nonce
    ? `${restaurantId}:${tableId}:${timestamp}:${nonce}`
    : `${restaurantId}:${tableId}:${timestamp}`;
  return createHmac('sha256', secretKey).update(message).digest('hex');
}

function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return timingSafeEqual(bufA, bufB);
}

/**
 * Validates a QR payload signature, nonce, and timestamp.
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
  if (
    !payload.restaurant_id ||
    !payload.table_id ||
    payload.timestamp === undefined ||
    !payload.signature
  ) {
    return { valid: false, error: 'Missing required fields' };
  }

  // Validate UUID formats
  if (!isValidUUID(payload.restaurant_id)) {
    return { valid: false, error: 'Invalid restaurant_id format' };
  }

  if (!isValidUUID(payload.table_id)) {
    return { valid: false, error: 'Invalid table_id format' };
  }

  // Check if this is a new QR code with nonce
  const hasNonce = isValidNonce(payload.nonce);

  // New QR codes must have nonce
  if (!hasNonce && payload.nonce !== undefined) {
    return { valid: false, error: 'Invalid nonce format' };
  }

  // Validate nonce presence for new QR codes
  if (!hasNonce && payload.nonce === undefined) {
    // This is a legacy QR code (no nonce) - accept it during grace period
    // But we should still validate timestamp against grace period
  }

  // Validate timestamp (uses 4h for new QR, 24h for legacy)
  if (!isTimestampValid(payload.timestamp, hasNonce)) {
    return { valid: false, error: 'QR code expired or invalid' };
  }

  // Validate expiry if present (new QR codes)
  if (hasNonce && payload.expiry !== undefined) {
    if (Date.now() > payload.expiry) {
      return { valid: false, error: 'QR code expired' };
    }
  }

  // Recompute signature and compare
  const computedSignature = computeSignature(
    payload.restaurant_id,
    payload.table_id,
    payload.timestamp,
    payload.nonce,
    secretKey
  );

  if (!timingSafeCompare(computedSignature, payload.signature)) {
    return { valid: false, error: 'Signature mismatch' };
  }

  return { valid: true };
}
