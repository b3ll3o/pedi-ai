'use client';

import { useState, useCallback } from 'react';

import styles from './ModifierGroupForm.module.css';

export interface ModifierValueInput {
  id?: string;
  tempId?: string;
  name: string;
  price_adjustment: number;
}

export interface ModifierGroupInput {
  name: string;
  required: boolean;
  min_selections: number;
  max_selections: number;
  values?: ModifierValueInput[];
}

interface ModifierGroupFormProps {
  modifierGroup?: any;
  modifierValues?: any[];
  onSubmit: (data: ModifierGroupInput) => void;
  onCancel: () => void;
}

interface ValueEntry extends ModifierValueInput {
  tempId?: string;
}

interface ValidationErrors {
  name?: string;
  minMax?: string;
  values?: string;
}

function validateMinMax(
  minSelections: number,
  maxSelections: number,
  required: boolean
): string | undefined {
  if (minSelections < 0) {
    return 'Valor mínimo não pode ser negativo';
  }
  if (maxSelections < 1) {
    return 'Valor máximo deve ser pelo menos 1';
  }
  if (maxSelections < minSelections) {
    return 'Valor máximo deve ser maior ou igual ao mínimo';
  }
  if (required && minSelections < 1) {
    return 'Se obrigatório, mínimo deve ser pelo menos 1';
  }
  return undefined;
}

function validateName(name: string): string | undefined {
  if (!name.trim()) {
    return 'Nome é obrigatório';
  }
  return undefined;
}

function validateModifierGroup(
  name: string,
  minSelections: number,
  maxSelections: number,
  required: boolean
): ValidationErrors {
  const errors: ValidationErrors = {};

  const nameError = validateName(name);
  if (nameError) errors.name = nameError;

  const minMaxError = validateMinMax(minSelections, maxSelections, required);
  if (minMaxError) errors.minMax = minMaxError;

  return errors;
}

function useModifierGroupForm(
  modifierGroup: any,
  modifierValues: any[],
  onSubmitProp: (data: ModifierGroupInput) => void
) {
  const isEditMode = Boolean(modifierGroup);
  const [name, setName] = useState(modifierGroup?.name ?? '');
  const [required, setRequired] = useState(modifierGroup?.required ?? false);
  const [minSelections, setMinSelections] = useState(modifierGroup?.min_selections ?? 0);
  const [maxSelections, setMaxSelections] = useState(modifierGroup?.max_selections ?? 1);
  const [values, setValues] = useState<ValueEntry[]>(
    modifierValues.length > 0
      ? modifierValues.map((v: { id: string; name: string; price_adjustment: number }) => ({
          id: v.id,
          name: v.name,
          price_adjustment: v.price_adjustment,
        }))
      : []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});

  const validateForm = useCallback((): boolean => {
    const newErrors = validateModifierGroup(name, minSelections, maxSelections, required);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, minSelections, maxSelections, required]);

  const addValue = useCallback(() => {
    setValues((prev) => [...prev, { name: '', price_adjustment: 0 }]);
  }, []);

  const removeValue = useCallback((index: number) => {
    setValues((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateValue = useCallback(
    (index: number, field: keyof ModifierValueInput, value: string | number) => {
      setValues((prev) => prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)));
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) return;

      setIsSubmitting(true);
      try {
        await onSubmitProp({
          name: name.trim(),
          required,
          min_selections: minSelections,
          max_selections: maxSelections,
          values: values.length > 0 ? values : undefined,
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [name, required, minSelections, maxSelections, values, onSubmitProp, validateForm]
  );

  return {
    name,
    setName,
    required,
    setRequired,
    minSelections,
    setMinSelections,
    maxSelections,
    setMaxSelections,
    values,
    isSubmitting,
    errors,
    isEditMode,
    addValue,
    removeValue,
    updateValue,
    handleSubmit,
  };
}

export function ModifierGroupForm({
  modifierGroup,
  modifierValues = [],
  onSubmit,
  onCancel,
}: ModifierGroupFormProps) {
  const {
    name,
    setName,
    required,
    setRequired,
    minSelections,
    setMinSelections,
    maxSelections,
    setMaxSelections,
    values,
    isSubmitting,
    errors,
    isEditMode,
    addValue,
    removeValue,
    updateValue,
    handleSubmit,
  } = useModifierGroupForm(modifierGroup, modifierValues, onSubmit);

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          {isEditMode ? 'Editar Grupo de Modificador' : 'Novo Grupo de Modificador'}
        </h2>
      </div>

      <div className={styles.field}>
        <label htmlFor="name" className={styles.label}>
          Nome <span className={styles.required}>*</span>
        </label>
        <input
          id="name"
          type="text"
          className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Tamanho, Adicional, Batata"
          disabled={isSubmitting}
        />
        {errors.name && <span className={styles.error}>{errors.name}</span>}
      </div>

      <div className={styles.field}>
        <label className={styles.toggleLabel}>
          <input
            type="checkbox"
            className={styles.toggleInput}
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
            disabled={isSubmitting}
          />
          <span className={styles.toggleSwitch}></span>
          <span className={styles.toggleText}>Obrigatório</span>
        </label>
        <span className={styles.hint}>
          Quando ativo, o cliente deve selecionar pelo menos uma opção
        </span>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="minSelections" className={styles.label}>
            Mínimo de Seleções
          </label>
          <input
            id="minSelections"
            type="number"
            className={styles.input}
            value={minSelections}
            onChange={(e) => setMinSelections(parseInt(e.target.value) || 0)}
            min={0}
            disabled={isSubmitting}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="maxSelections" className={styles.label}>
            Máximo de Seleções
          </label>
          <input
            id="maxSelections"
            type="number"
            className={styles.input}
            value={maxSelections}
            onChange={(e) => setMaxSelections(parseInt(e.target.value) || 1)}
            min={1}
            disabled={isSubmitting}
          />
        </div>
      </div>

      {errors.minMax && <span className={styles.error}>{errors.minMax}</span>}

      <div className={styles.field}>
        <div className={styles.valuesHeader}>
          <label className={styles.label}>Valores do Modificador</label>
          <button
            type="button"
            className={styles.addValueButton}
            onClick={addValue}
            disabled={isSubmitting}
          >
            + Adicionar Valor
          </button>
        </div>

        {values.length === 0 ? (
          <span className={styles.hint}>
            Nenhum valor adicionado. Clique em &quot;Adicionar Valor&quot; para começar.
          </span>
        ) : (
          <div className={styles.valuesList}>
            {values.map((value, index) => (
              <div key={index} className={styles.valueRow}>
                <input
                  type="text"
                  className={styles.valueNameInput}
                  value={value.name}
                  onChange={(e) => updateValue(index, 'name', e.target.value)}
                  placeholder="Nome (Ex: Grande, Médio)"
                  disabled={isSubmitting}
                />
                <div className={styles.priceField}>
                  <span className={styles.currencyPrefix}>R$</span>
                  <input
                    type="number"
                    step="0.01"
                    className={styles.priceInput}
                    value={value.price_adjustment}
                    onChange={(e) =>
                      updateValue(index, 'price_adjustment', parseFloat(e.target.value) || 0)
                    }
                    placeholder="0.00"
                    disabled={isSubmitting}
                  />
                </div>
                <button
                  type="button"
                  className={styles.removeValueButton}
                  onClick={() => removeValue(index)}
                  disabled={isSubmitting}
                  aria-label="Remover valor"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.cancelButton}
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </button>
        <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : isEditMode ? 'Salvar Alterações' : 'Criar Grupo'}
        </button>
      </div>
    </form>
  );
}
