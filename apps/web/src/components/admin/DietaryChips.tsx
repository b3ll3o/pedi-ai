'use client';

import styles from './ProductForm.module.css';

interface DietaryChipsProps {
  selectedLabels: string[];
  onToggle: (label: string) => void;
  disabled?: boolean;
}

const DIETARY_OPTIONS = [
  'vegetarian',
  'vegan',
  'gluten_free',
  'dairy_free',
  'spicy',
  'sweet',
  'sour',
  'bitter',
  'umami',
];

export function DietaryChips({ selectedLabels, onToggle, disabled }: DietaryChipsProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>Informações Nutricionais</label>
      <div className={styles.dietaryGrid}>
        {DIETARY_OPTIONS.map((label) => (
          <button
            key={label}
            type="button"
            className={`${styles.dietaryChip} ${selectedLabels.includes(label) ? styles.dietaryChipActive : ''}`}
            onClick={() => onToggle(label)}
            disabled={disabled}
          >
            {label.replace('_', ' ')}
          </button>
        ))}
      </div>
    </div>
  );
}
