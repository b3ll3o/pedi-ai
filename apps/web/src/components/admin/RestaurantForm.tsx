'use client';

/* eslint-disable react-hooks/set-state-in-effect -- padrão válido para sincronizar form com props (controlled inputs) */

import { useState, useRef, useEffect, useCallback } from 'react';

import { FormTitle, SubmitButton } from './FormFieldComponents';
import { LogoUploadField } from './LogoUploadField';
import styles from './RestaurantForm.module.css';
import { formatCNPJ, formatPhone, validateCNPJ, validatePhone } from './restaurantFormHelpers';

export type RestaurantFormMode = 'create' | 'edit';

export interface RestaurantFormData {
  nome: string;
  cnpj: string;
  endereco?: string;
  telefone?: string;
  logoUrl?: string;
}

interface RestaurantFormProps {
  mode: RestaurantFormMode;
  initialData?: RestaurantFormData;
  onSubmit: (data: RestaurantFormData) => Promise<void>;
  onCancel: () => void;
}

interface FormErrors {
  nome?: string;
  cnpj?: string;
  telefone?: string;
}

function validateNome(nome: string): string | undefined {
  if (!nome.trim()) return 'Nome é obrigatório';
  if (nome.trim().length < 2) return 'Nome deve ter pelo menos 2 caracteres';
  return undefined;
}

function validateNomeField(nome: string, mode: RestaurantFormMode): string | undefined {
  if (mode === 'create' || nome.trim()) {
    return validateNome(nome);
  }
  return undefined;
}

function validateCnpjField(cnpj: string, mode: RestaurantFormMode): string | undefined {
  if (mode !== 'create') return undefined;
  if (!cnpj.trim()) return 'CNPJ é obrigatório';
  if (!validateCNPJ(cnpj)) return 'CNPJ inválido (formato: XX.XXX.XXX/XXXX-XX)';
  return undefined;
}

function validateTelefoneField(telefone: string): string | undefined {
  if (telefone.trim() && !validatePhone(telefone)) return 'Telefone inválido';
  return undefined;
}

function validateFormData(
  formData: { nome: string; cnpj: string; telefone: string },
  mode: RestaurantFormMode
): FormErrors {
  const errors: FormErrors = {};
  const nomeError = validateNomeField(formData.nome, mode);
  if (nomeError) errors.nome = nomeError;

  const cnpjError = validateCnpjField(formData.cnpj, mode);
  if (cnpjError) errors.cnpj = cnpjError;

  const telefoneError = validateTelefoneField(formData.telefone);
  if (telefoneError) errors.telefone = telefoneError;

  return errors;
}

function NomeField({
  value,
  onChange,
  errors,
  isSubmitting,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  errors: FormErrors;
  isSubmitting: boolean;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor="nome" className={styles.label}>
        Nome <span className={styles.required}>*</span>
      </label>
      <input
        id="nome"
        type="text"
        data-testid="restaurant-name-input"
        className={`${styles.input} ${errors.nome ? styles.inputError : ''}`}
        value={value}
        onChange={onChange}
        placeholder="Ex: Restaurante Central"
        disabled={isSubmitting}
        aria-invalid={!!errors.nome}
        aria-describedby={errors.nome ? 'nome-error' : undefined}
        autoComplete="organization"
      />
      {errors.nome && (
        <span id="nome-error" className={styles.error} role="alert">
          {errors.nome}
        </span>
      )}
    </div>
  );
}

function TelefoneField({
  value,
  onChange,
  errors,
  isSubmitting,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  errors: FormErrors;
  isSubmitting: boolean;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor="telefone" className={styles.label}>
        Telefone
      </label>
      <input
        id="telefone"
        type="tel"
        inputMode="tel"
        data-testid="restaurant-phone-input"
        className={`${styles.input} ${errors.telefone ? styles.inputError : ''}`}
        value={value}
        onChange={onChange}
        placeholder="(XX) XXXXX-XXXX"
        disabled={isSubmitting}
        aria-invalid={!!errors.telefone}
        aria-describedby={errors.telefone ? 'telefone-error' : undefined}
        autoComplete="tel"
        maxLength={15}
      />
      {errors.telefone && (
        <span id="telefone-error" className={styles.error} role="alert">
          {errors.telefone}
        </span>
      )}
    </div>
  );
}

function useRestaurantForm(
  mode: RestaurantFormMode,
  initialData?: RestaurantFormData,
  onSubmitProp?: (data: RestaurantFormData) => Promise<void>,
  _onCancelProp?: () => void
) {
  const [formData, setFormData] = useState({
    nome: initialData?.nome ?? '',
    cnpj: initialData?.cnpj ?? '',
    endereco: initialData?.endereco ?? '',
    telefone: initialData?.telefone ?? '',
    logoUrl: initialData?.logoUrl ?? '',
  });
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.logoUrl ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync form when initialData changes (for edit mode)
  useEffect(() => {
    if (!initialData) return;
    setFormData({
      nome: initialData.nome ?? '',
      cnpj: initialData.cnpj ?? '',
      endereco: initialData.endereco ?? '',
      telefone: initialData.telefone ?? '',
      logoUrl: initialData.logoUrl ?? '',
    });
    setImagePreview(initialData.logoUrl ?? null);
  }, [initialData]);

  const clearError = useCallback((field: keyof FormErrors) => {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }, []);

  const handleNomeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, nome: e.target.value }));
      clearError('nome');
    },
    [clearError]
  );

  const handleCnpjChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, cnpj: formatCNPJ(e.target.value) }));
      clearError('cnpj');
    },
    [clearError]
  );

  const handlePhoneChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, telefone: formatPhone(e.target.value) }));
      clearError('telefone');
    },
    [clearError]
  );

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setSubmitError('Por favor, selecione um arquivo de imagem');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    setSubmitError(null);
    setFormData((prev) => ({ ...prev, logoUrl: '' }));
  }, []);

  const handleEnderecoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, endereco: e.target.value }));
  }, []);

  const handleRemoveImage = useCallback(() => {
    setImagePreview(null);
    setFormData((prev) => ({ ...prev, logoUrl: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const validationErrors = validateFormData(formData, mode);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        await onSubmitProp?.({
          nome: formData.nome.trim(),
          cnpj: formData.cnpj.trim(),
          endereco: formData.endereco.trim() || undefined,
          telefone: formData.telefone.trim() || undefined,
          logoUrl: formData.logoUrl || undefined,
        });
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Erro ao salvar restaurante');
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, mode, onSubmitProp]
  );

  return {
    formData,
    imagePreview,
    isSubmitting,
    errors,
    submitError,
    fileInputRef,
    handleNomeChange,
    handleCnpjChange,
    handlePhoneChange,
    handleImageChange,
    handleEnderecoChange,
    handleRemoveImage,
    handleSubmit,
  };
}

export function RestaurantForm({ mode, initialData, onSubmit, onCancel }: RestaurantFormProps) {
  const {
    formData,
    imagePreview,
    isSubmitting,
    errors,
    submitError,
    fileInputRef,
    handleNomeChange,
    handleCnpjChange,
    handlePhoneChange,
    handleImageChange,
    handleEnderecoChange,
    handleRemoveImage,
    handleSubmit,
  } = useRestaurantForm(mode, initialData, onSubmit, onCancel);

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.header}>
        <FormTitle mode={mode} />
      </div>

      <NomeField
        value={formData.nome}
        onChange={handleNomeChange}
        errors={errors}
        isSubmitting={isSubmitting}
      />

      {mode === 'create' && (
        <div className={styles.field}>
          <label htmlFor="cnpj" className={styles.label}>
            CNPJ <span className={styles.required}>*</span>
          </label>
          <input
            id="cnpj"
            type="text"
            inputMode="numeric"
            data-testid="restaurant-cnpj-input"
            className={`${styles.input} ${errors.cnpj ? styles.inputError : ''}`}
            value={formData.cnpj}
            onChange={handleCnpjChange}
            placeholder="XX.XXX.XXX/XXXX-XX"
            disabled={isSubmitting}
            aria-invalid={!!errors.cnpj}
            aria-describedby={errors.cnpj ? 'cnpj-error' : undefined}
            autoComplete="organization-title"
            maxLength={18}
          />
          {errors.cnpj && (
            <span id="cnpj-error" className={styles.error} role="alert">
              {errors.cnpj}
            </span>
          )}
        </div>
      )}

      <div className={styles.field}>
        <label htmlFor="endereco" className={styles.label}>
          Endereço
        </label>
        <input
          id="endereco"
          type="text"
          data-testid="restaurant-address-input"
          className={styles.input}
          value={formData.endereco}
          onChange={handleEnderecoChange}
          placeholder="Endereço completo do restaurante"
          disabled={isSubmitting}
          autoComplete="street-address"
        />
      </div>

      <TelefoneField
        value={formData.telefone}
        onChange={handlePhoneChange}
        errors={errors}
        isSubmitting={isSubmitting}
      />

      <LogoUploadField
        imagePreview={imagePreview}
        fileInputRef={fileInputRef}
        onImageChange={handleImageChange}
        onRemoveImage={handleRemoveImage}
        isSubmitting={isSubmitting}
      />

      {submitError && (
        <span className={styles.error} role="alert">
          {submitError}
        </span>
      )}

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
          data-testid="save-button"
          className={styles.submitButton}
          disabled={isSubmitting}
        >
          <SubmitButton isSubmitting={isSubmitting} mode={mode} />
        </button>
      </div>
    </form>
  );
}
