'use client';

import { useState } from 'react';
import type { modifier_groups, modifier_values } from '@/lib/supabase/types';
import styles from './ModifierGroupForm.module.css';

export interface ModifierValueInput {
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
  modifierGroup?: modifier_groups;
  modifierValues?: modifier_values[];
  onSubmit: (data: ModifierGroupInput) => void;
  onCancel: () => void;
}

interface ValueEntry extends ModifierValueInput {
  tempId?: string;
}

export function ModifierGroupForm({ modifierGroup, modifierValues = [], onSubmit, onCancel }: ModifierGroupFormProps) {
  const isEditMode = Boolean(modifierGroup);
  const [name, setName] = useState(modifierGroup?.name ?? '');
  const [required, setRequired] = useState(modifierGroup?.required ?? false);
  const [minSelections, setMinSelections] = useState(modifierGroup?.min_selections ?? 0);
  const [maxSelections, setMaxSelections] = useState(modifierGroup?.max_selections ?? 1);
  const [values, setValues] = useState<ValueEntry[]>(
    modifierValues.length > 0
      ? modifierValues.map(v => ({ name: v.name, price_adjustment: v.price_adjustment }))
      : []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; minMax?: string; values?: string }>({});

  const validateForm = (): boolean => {
    const newErrors: { name?: string; minMax?: string; values?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (minSelections < 0) {
      newErrors.minMax = 'Valor mínimo não pode ser negativo';
    } else if (maxSelections < minSelections) {
      newErrors.minMax = 'Valor máximo deve ser maior ou igual ao mínimo';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addValue = () => {
    setValues(prev => [...prev, { name: '', price_adjustment: 0 }]);
  };

  const removeValue = (index: number) => {
    setValues(prev => prev.filter((_, i) => i !== index));
  };

  const updateValue = (index: number, field: keyof ModifierValueInput, value: string | number) => {
    setValues(prev => prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        required,
        min_selections: minSelections,
        max_selections: maxSelections,
        values: values.length > 0 ? values : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <span className={styles.hint}>Quando ativo, o cliente deve selecionar pelo menos uma opção</span>
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
          <span className={styles.hint}>Nenhum valor adicionado. Clique em "Adicionar Valor" para começar.</span>
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
                    onChange={(e) => updateValue(index, 'price_adjustment', parseFloat(e.target.value) || 0)}
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
        <button
          type="submit"
          className={styles.submitButton}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Salvando...' : isEditMode ? 'Salvar Alterações' : 'Criar Grupo'}
        </button>
      </div>
    </form>
  );
}