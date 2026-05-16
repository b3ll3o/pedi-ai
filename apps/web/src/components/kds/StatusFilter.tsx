'use client';

import styles from './StatusFilter.module.css';

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'cancelled';

interface StatusOption {
  value: OrderStatus | 'all';
  label: string;
  icon: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'all', label: 'Todos', icon: '📋' },
  { value: 'paid', label: 'Novos', icon: '📋' },
  { value: 'preparing', label: 'Preparando', icon: '🔥' },
  { value: 'ready', label: 'Prontos', icon: '✅' },
];

interface StatusFilterProps {
  selectedStatus: OrderStatus | 'all';
  onStatusChange: (status: OrderStatus | 'all') => void;
  counts?: Record<OrderStatus | 'all', number>;
}

export function StatusFilter({ selectedStatus, onStatusChange, counts }: StatusFilterProps) {
  return (
    <nav className={styles.filterBar} aria-label="Filtrar pedidos por status">
      <ul className={styles.filterList} role="list">
        {STATUS_OPTIONS.map((option) => (
          <li key={option.value}>
            <button
              type="button"
              className={`${styles.filterButton} ${
                selectedStatus === option.value ? styles.active : ''
              }`}
              onClick={() => onStatusChange(option.value)}
              aria-pressed={selectedStatus === option.value}
              aria-label={`Filtrar por ${option.label}${counts?.[option.value] !== undefined ? `, ${counts[option.value]} pedidos` : ''}`}
            >
              <span className={styles.icon} aria-hidden="true">
                {option.icon}
              </span>
              <span className={styles.label}>{option.label}</span>
              {counts?.[option.value] !== undefined && (
                <span className={styles.count}>{counts[option.value]}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
