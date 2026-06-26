'use client';

import { useId } from 'react';

import styles from './ModifierSelector.module.css';
import type { ModifierGroup, SelectedModifier } from './types';

// ── Props ────────────────────────────────────────────────────

interface ModifierSelectorProps {
  modifierGroup: ModifierGroup;
  selectedValues: SelectedModifier[];
  onChange: (values: SelectedModifier[]) => void;
  'data-testid'?: string;
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
  'data-testid': dataTestid,
}: ModifierSelectorProps) {
  const {
    id: groupId,
    min_selections,
    max_selections,
    required,
    name,
    modifier_values,
  } = modifierGroup;

  // IDs únicos e estáveis — necessário para conectar `<legend>`/`<label>`
  // via `aria-labelledby`/`for`, e para que o screen reader consiga
  // anunciar cada opção com seu nome.
  const reactId = useId();
  const groupLegendId = `${reactId}-legend`;
  const hintId = `${reactId}-hint`;
  const errorId = `${reactId}-error`;
  const inputId = (valueId: string) => `${reactId}-${valueId}`;

  const selectedIds = new Set(selectedValues.map((v) => v.modifier_id));
  const selectedCount = selectedIds.size;
  const isMulti = max_selections !== 1;

  const isAtMax = selectedCount >= max_selections;
  const isBelowMin = selectedCount < min_selections;

  const handleToggle = (modifierValue: ModifierGroup['modifier_values'][number]) => {
    const modifier: SelectedModifier = {
      group_id: groupId,
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
    <fieldset className={styles.group} data-testid={dataTestid} data-modifier-group-id={groupId}>
      <legend className={styles.header}>
        <span id={groupLegendId} className={styles.name}>
          {name}
        </span>
        {required && <span className={styles.requiredBadge}>Obrigatório</span>}
        <span id={hintId} className={styles.selectionHint}>
          {buildSelectionHint(min_selections, max_selections)}
        </span>
      </legend>

      <div
        className={styles.options}
        role={isMulti ? 'group' : 'radiogroup'}
        aria-labelledby={groupLegendId}
        aria-describedby={hintId}
        aria-required={required}
        aria-invalid={required && isBelowMin ? 'true' : undefined}
      >
        {modifier_values.map((mv) => {
          const isSelected = selectedIds.has(mv.id);
          const isDisabled = isMulti && !isSelected && isAtMax;
          // `unavailable` values: bloqueia seleção mas mantém visível
          const isUnavailable = !mv.available;

          return (
            <label
              key={mv.id}
              htmlFor={inputId(mv.id)}
              className={`${styles.option} ${isSelected ? styles.selected : ''} ${isDisabled || isUnavailable ? styles.disabled : ''}`}
            >
              <input
                id={inputId(mv.id)}
                type={isMulti ? 'checkbox' : 'radio'}
                name={`${reactId}-group`}
                value={mv.id}
                checked={isSelected}
                disabled={isDisabled || isUnavailable}
                onChange={() => !isDisabled && handleToggle(mv)}
                className={styles.visuallyHiddenInput}
              />
              <span className={styles.optionName}>{mv.name}</span>
              {mv.price_adjustment !== 0 && (
                <span className={styles.priceAdjustment}>
                  {mv.price_adjustment > 0 ? '+' : ''}
                  {formatPrice(mv.price_adjustment)}
                </span>
              )}
            </label>
          );
        })}
      </div>

      {required && isBelowMin && (
        <p id={errorId} className={styles.error} role="alert">
          Selecione pelo menos {min_selections} opção{min_selections > 1 ? 'ões' : ''}.
        </p>
      )}
    </fieldset>
  );
}
