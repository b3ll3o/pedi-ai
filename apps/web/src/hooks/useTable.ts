import { useMutation } from '@tanstack/react-query';
import { useTableStore } from '@/infrastructure/persistence/tableStore';
import type { QRPayload } from '@/lib/qr/validator';

// ── Types ───────────────────────────────────────────────────

export interface TableContext {
  restaurantId: string | null;
  tableId: string | null;
  tableName: string | null;
  isValid: boolean;
}

interface ValidateResponse {
  valid: boolean;
  table?: {
    id: string;
    name: string;
    number: number;
  };
  error?: string;
}

// ── Hook ────────────────────────────────────────────────────

/**
 * Manages table context from QR code scan.
 *
 * Provides access to current table info and operations to
 * validate a QR payload and set/clear table context.
 *
 * @example
 * ```tsx
 * const { table, setTable, validateTable, clearTable } = useTable()
 * ```
 */
export function useTable() {
  const { restaurantId, tableId, tableName, setTable, clearTable } = useTableStore();

  const validateTableMutation = useMutation<ValidateResponse, Error, QRPayload>({
    mutationFn: async (payload: QRPayload) => {
      const response = await fetch('/api/tables/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.message ?? `Validation failed: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: (data, payload) => {
      if (data.valid && data.table) {
        setTable(payload.restaurant_id, data.table.id, data.table.name);
      }
    },
  });

  /**
   * Validates a QR payload against the server and updates table context.
   *
   * @param payload - The QR payload to validate
   * @returns True if validation succeeded, false otherwise
   */
  const validateTable = async (payload: QRPayload): Promise<boolean> => {
    try {
      const result = await validateTableMutation.mutateAsync(payload);
      return result.valid;
    } catch {
      return false;
    }
  };

  const table: TableContext = {
    restaurantId,
    tableId,
    tableName,
    isValid: !!(restaurantId && tableId && tableName),
  };

  return {
    table,
    setTable,
    validateTable,
    clearTable,
  };
}
