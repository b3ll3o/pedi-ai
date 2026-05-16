import { createHmac, randomUUID } from 'crypto';

export interface QRPayload {
  restaurant_id: string;
  table_id: string;
  timestamp: number;
  nonce: string;
  expiry: number;
  signature: string;
}

const QR_EXPIRY_MS = 4 * 60 * 60 * 1000; // 4 hours

/**
 * Generates a signed QR payload for table identification.
 *
 * @param restaurantId - The restaurant's unique identifier
 * @param tableId - The table's unique identifier
 * @param secretKey - The secret key for HMAC signing (from environment)
 * @returns QRPayload object containing all fields and computed signature
 */
export function generateQRPayload(
  restaurantId: string,
  tableId: string,
  secretKey: string
): QRPayload {
  const timestamp = Date.now();
  const nonce = randomUUID();
  const expiry = timestamp + QR_EXPIRY_MS;

  // Create payload object
  const payload: QRPayload = {
    restaurant_id: restaurantId,
    table_id: tableId,
    timestamp,
    nonce,
    expiry,
    signature: '',
  };

  // Create message for signing: restaurant_id:table_id:timestamp:nonce
  const message = `${restaurantId}:${tableId}:${timestamp}:${nonce}`;

  // Compute HMAC-SHA256 signature
  const signature = createHmac('sha256', secretKey).update(message).digest('hex');

  return {
    ...payload,
    signature,
  };
}
