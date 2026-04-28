'use client';

import styles from './PaymentMethodSelector.module.css';

export type PaymentMethod = 'pix';

export interface PaymentMethodSelectorProps {
  selected: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}

function PixIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      width="24"
      height="24"
      aria-hidden="true"
    >
      <path d="M11.354 2.646a.9.9 0 0 1 1.292 0l2.193 2.193a2.1 2.1 0 0 0 1.485.614h.98a2.1 2.1 0 0 1 2.1 2.1v.98a2.1 2.1 0 0 0 .614 1.485l2.193 2.193a.9.9 0 0 1 0 1.292l-2.193 2.193a2.1 2.1 0 0 0-.614 1.485v.98a2.1 2.1 0 0 1-2.1 2.1h-.98a2.1 2.1 0 0 0-1.485.614l-2.193 2.193a.9.9 0 0 1-1.292 0l-2.193-2.193a2.1 2.1 0 0 0-1.485-.614h-.98a2.1 2.1 0 0 1-2.1-2.1v-.98a2.1 2.1 0 0 0-.614-1.485L1.789 12.65a.9.9 0 0 1 0-1.292L3.982 9.16a2.1 2.1 0 0 0 .614-1.485v-.98a2.1 2.1 0 0 1 2.1-2.1h.98a2.1 2.1 0 0 0 1.485-.614l2.193-2.193Z" />
    </svg>
  );
}

export function PaymentMethodSelector({ selected, onChange }: PaymentMethodSelectorProps) {
  return (
    <div className={styles.container}>
      <p className={styles.title}>Forma de pagamento</p>

      <div className={styles.options}>
        <button
          type="button"
          className={`${styles.option} ${selected === 'pix' ? styles.selected : ''}`}
          onClick={() => onChange('pix')}
          aria-pressed={selected === 'pix'}
          data-testid="payment-method-pix"
        >
          <span className={styles.iconWrapper}>
            <PixIcon />
          </span>
          <span className={styles.optionContent}>
            <span className={styles.optionLabel}>Pix</span>
            <span className={styles.optionDescription}>Aprovação instantânea</span>
          </span>
          <span className={styles.radio} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
