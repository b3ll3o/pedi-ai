'use client';

import styles from './PaymentMethodSelector.module.css';

export type PaymentMethod = 'pix' | 'card';

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

function CardIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      width="24"
      height="24"
      aria-hidden="true"
    >
      <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 5h16v2H4V9Zm2 5h4v2H6v-2Z" />
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

        <button
          type="button"
          className={`${styles.option} ${selected === 'card' ? styles.selected : ''}`}
          onClick={() => onChange('card')}
          aria-pressed={selected === 'card'}
        >
          <span className={styles.iconWrapper}>
            <CardIcon />
          </span>
          <span className={styles.optionContent}>
            <span className={styles.optionLabel}>Cartão</span>
            <span className={styles.optionDescription}>Crédito ou débito</span>
          </span>
          <span className={styles.radio} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
