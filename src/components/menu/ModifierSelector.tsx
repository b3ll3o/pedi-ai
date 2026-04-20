'use client';

import type { ModifierGroup, SelectedModifier } from './types';
import styles from './ModifierSelector.module.css';

// ── Props ────────────────────────────────────────────────────

interface ModifierSelectorProps {
  modifierGroup: ModifierGroup;
  selectedValues: SelectedModifier[];
  onChange: (values: SelectedModifier[]) => void;
}

// ── Helpers ────────────────────────────────────────────────────

function formatPrice(price: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price);
}

function buildSelectionHint(min: number, max: number): string {
  if (min === max) {
    return min === 1 ? 'Selecione 1 opção' : `Selecione ${min}`;
  }
  return `Selecione entre ${min} e ${max} opções`;
}

// ── Component ────────────────────────────────────────────────────

export function ModifierSelector({
  modifierGroup,
  selectedValues,
  onChange,
}: ModifierSelectorProps) {
  const { min_selections, max_selections, required, name } = modifierGroup;

  const selectedIds = new Set(selectedValues.map((v) => v.modifier_id));
  const selectedCount = selectedIds.size;
  const isMulti = max_selections !== 1;

  const isAtMax = selectedCount >= max_selections;
  const isBelowMin = selectedCount < min_selections;

  const handleToggle = (modifierValue: ModifierGroup['modifier_values'][number]) => {
    const modifier: SelectedModifier = {
      group_id: modifierGroup.id,
      group_name: name,
      modifier_id: modifierValue.id,
      name: modifierValue.name,
      price_adjustment: modifierValue.price_adjustment,
    };

    if (isMulti) {
      if (selectedIds.has(modifierValue.id)) {
        onChange(selectedValues.filter((v) => v.modifier_id !== modifierValue.id));
      } else if (!isAtMax) {
        onChange([...selectedValues, modifier]);
      }
    } else {
      // Single selection (radio)
      if (selectedIds.has(modifierValue.id)) {
        // Allow deselect only if not required
        if (!required) {
          onChange([]);
        }
      } else {
        onChange([modifier]);
      }
    }
  };

  return (
    <div className={styles.group}>
      <div className={styles.header}>
        <h4 className={styles.name}>{name}</h4>
        {required && <span className={styles.requiredBadge}>Obrigatório</span>}
        <span className={styles.selectionHint}>{buildSelectionHint(min_selections, max_selections)}</span>
      </div>

      <div className={styles.options} role={isMulti ? 'group' : 'radiogroup'}>
        {modifierGroup.modifier_values.map((mv) => {
          const isSelected = selectedIds.has(mv.id);
          const isDisabled = isMulti && !isSelected && isAtMax;

          return (
            <button
              key={mv.id}
              type="button"
              className={`${styles.option} ${isSelected ? styles.selected : ''} ${isDisabled ? styles.disabled : ''}`}
              onClick={() => !isDisabled && handleToggle(mv)}
              disabled={isDisabled}
              aria-checked={isMulti ? undefined : isSelected}
              role={isMulti ? 'checkbox' : 'radio'}
            >
              <span className={styles.optionName}>{mv.name}</span>
              {mv.price_adjustment !== 0 && (
                <span className={styles.priceAdjustment}>
                  {mv.price_adjustment > 0 ? '+' : ''}{formatPrice(mv.price_adjustment)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {required && isBelowMin && (
        <p className={styles.error}>
          Selecione pelo menos {min_selections} opção{min_selections > 1 ? 'ões' : ''}.
        </p>
      )}
    </div>
  );
}