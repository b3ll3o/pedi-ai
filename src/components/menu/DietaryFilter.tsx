'use client';

import styles from './DietaryFilter.module.css';

export type DietaryLabel = 'vegetarian' | 'vegan' | 'gluten-free' | 'lactose-free' | 'sugar-free' | 'organic';

interface DietaryFilterProps {
  selectedFilters: DietaryLabel[];
  onFilterChange: (filters: DietaryLabel[]) => void;
}

const DIETARY_CONFIG: Record<DietaryLabel, { label: string; color: string }> = {
  vegetarian: { label: 'Vegetariano', color: '#22c55e' },
  vegan: { label: 'Vegano', color: '#16a34a' },
  'gluten-free': { label: 'Sem Glúten', color: '#eab308' },
  'lactose-free': { label: 'Sem Lactose', color: '#3b82f6' },
  'sugar-free': { label: 'Sem Açúcar', color: '#f97316' },
  organic: { label: 'Orgânico', color: '#84cc16' },
};

const ALL_DIETARY_LABELS: DietaryLabel[] = [
  'vegetarian',
  'vegan',
  'gluten-free',
  'lactose-free',
  'sugar-free',
  'organic',
];

export function DietaryFilter({ selectedFilters, onFilterChange }: DietaryFilterProps) {
  const handleToggle = (filter: DietaryLabel) => {
    if (selectedFilters.includes(filter)) {
      onFilterChange(selectedFilters.filter((f) => f !== filter));
    } else {
      onFilterChange([...selectedFilters, filter]);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.filterRow}>
        {ALL_DIETARY_LABELS.map((filter) => {
          const config = DIETARY_CONFIG[filter];
          const isActive = selectedFilters.includes(filter);

          return (
            <button
              key={filter}
              type="button"
              className={`${styles.chip} ${isActive ? styles.active : ''}`}
              onClick={() => handleToggle(filter)}
              aria-pressed={isActive}
              style={{
                '--filter-color': config.color,
                '--filter-color-light': `${config.color}20`,
              } as React.CSSProperties}
            >
              <span className={styles.label}>{config.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
