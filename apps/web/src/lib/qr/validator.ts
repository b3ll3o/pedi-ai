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

function validateRequiredFields(payload: QRPayload): { valid: boolean; error?: string } {
  if (
    !payload.restaurant_id ||
    !payload.table_id ||
    payload.timestamp === undefined ||
    !payload.signature
  ) {
    return { valid: false, error: 'Missing required fields' };
  }
  return { valid: true };
}

function validateUUIDs(payload: QRPayload): { valid: boolean; error?: string } {
  if (!isValidUUID(payload.restaurant_id)) {
    return { valid: false, error: 'Invalid restaurant_id format' };
  }
  if (!isValidUUID(payload.table_id)) {
    return { valid: false, error: 'Invalid table_id format' };
  }
  return { valid: true };
}

function validateNonceFormat(payload: QRPayload): {
  valid: boolean;
  error?: string;
  hasNonce?: boolean;
} {
  const hasNonce = isValidNonce(payload.nonce);
  if (!hasNonce && payload.nonce !== undefined) {
    return { valid: false, error: 'Invalid nonce format' };
  }
  return { valid: true, hasNonce };
}

function validateTimestamp(
  payload: QRPayload,
  hasNonce: boolean
): { valid: boolean; error?: string } {
  if (!isTimestampValid(payload.timestamp, hasNonce)) {
    return { valid: false, error: 'QR code expired or invalid' };
  }
  return { valid: true };
}

function validateExpiry(payload: QRPayload, hasNonce: boolean): { valid: boolean; error?: string } {
  if (hasNonce && payload.expiry !== undefined && Date.now() > payload.expiry) {
    return { valid: false, error: 'QR code expired' };
  }
  return { valid: true };
}

function validateSignature(
  payload: QRPayload,
  secretKey: string
): { valid: boolean; error?: string } {
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
  const requiredCheck = validateRequiredFields(payload);
  if (!requiredCheck.valid) return requiredCheck;

  const uuidCheck = validateUUIDs(payload);
  if (!uuidCheck.valid) return uuidCheck;

  const nonceCheck = validateNonceFormat(payload);
  if (!nonceCheck.valid) return nonceCheck;
  const hasNonce = nonceCheck.hasNonce ?? false;

  const timestampCheck = validateTimestamp(payload, hasNonce);
  if (!timestampCheck.valid) return timestampCheck;

  const expiryCheck = validateExpiry(payload, hasNonce);
  if (!expiryCheck.valid) return expiryCheck;

  const signatureCheck = validateSignature(payload, secretKey);
  if (!signatureCheck.valid) return signatureCheck;

  return { valid: true };
}
