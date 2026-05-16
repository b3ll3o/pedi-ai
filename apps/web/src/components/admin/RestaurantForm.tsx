'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import styles from './RestaurantForm.module.css';

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

const CNPJ_MASK = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;

function formatCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function validateCNPJ(cnpj: string): boolean {
  return CNPJ_MASK.test(cnpj);
}

function validatePhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 11;
}

export function RestaurantForm({ mode, initialData, onSubmit, onCancel }: RestaurantFormProps) {
  const [formData, setFormData] = useState({
    nome: initialData?.nome ?? '',
    cnpj: initialData?.cnpj ?? '',
    endereco: initialData?.endereco ?? '',
    telefone: initialData?.telefone ?? '',
    logoUrl: initialData?.logoUrl ?? '',
  });
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.logoUrl ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    nome?: string;
    cnpj?: string;
    telefone?: string;
  }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialDataRef = useRef(initialData);

  // Sync form when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData && initialData !== initialDataRef.current) {
      initialDataRef.current = initialData;
      setFormData({
        nome: initialData.nome ?? '',
        cnpj: initialData.cnpj ?? '',
        endereco: initialData.endereco ?? '',
        telefone: initialData.telefone ?? '',
        logoUrl: initialData.logoUrl ?? '',
      });
      setImagePreview(initialData.logoUrl ?? null);
    }
  }, [initialData]);

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    } else if (formData.nome.trim().length < 2) {
      newErrors.nome = 'Nome deve ter pelo menos 2 caracteres';
    }

    if (mode === 'create') {
      if (!formData.cnpj.trim()) {
        newErrors.cnpj = 'CNPJ é obrigatório';
      } else if (!validateCNPJ(formData.cnpj)) {
        newErrors.cnpj = 'CNPJ inválido (formato: XX.XXX.XXX/XXXX-XX)';
      }
    }

    if (formData.telefone.trim() && !validatePhone(formData.telefone)) {
      newErrors.telefone = 'Telefone inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    setFormData((prev) => ({ ...prev, cnpj: formatted }));
    if (errors.cnpj) {
      setErrors((prev) => ({ ...prev, cnpj: undefined }));
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setFormData((prev) => ({ ...prev, telefone: formatted }));
    if (errors.telefone) {
      setErrors((prev) => ({ ...prev, telefone: undefined }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSubmitError('Por favor, selecione um arquivo de imagem');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setSubmitError(null);
    setFormData((prev) => ({ ...prev, logoUrl: '' }));
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setFormData((prev) => ({ ...prev, logoUrl: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit({
        nome: formData.nome.trim(),
        cnpj: formData.cnpj.trim(),
        endereco: formData.endereco.trim() || undefined,
        telefone: formData.telefone.trim() || undefined,
        logoUrl: formData.logoUrl || undefined,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar restaurante';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.header}>
        <h2 className={styles.title}>
          {mode === 'edit' ? 'Editar Restaurante' : 'Novo Restaurante'}
        </h2>
      </div>

      <div className={styles.field}>
        <label htmlFor="nome" className={styles.label}>
          Nome <span className={styles.required}>*</span>
        </label>
        <input
          id="nome"
          type="text"
          data-testid="restaurant-name-input"
          className={`${styles.input} ${errors.nome ? styles.inputError : ''}`}
          value={formData.nome}
          onChange={(e) => {
            setFormData((prev) => ({ ...prev, nome: e.target.value }));
            if (errors.nome) setErrors((prev) => ({ ...prev, nome: undefined }));
          }}
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
            onChange={handleCNPJChange}
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
          onChange={(e) => setFormData((prev) => ({ ...prev, endereco: e.target.value }))}
          placeholder="Endereço completo do restaurante"
          disabled={isSubmitting}
          autoComplete="street-address"
        />
      </div>

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
          value={formData.telefone}
          onChange={handlePhoneChange}
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

      <div className={styles.field}>
        <label className={styles.label}>Logo</label>
        <div className={styles.imageUpload}>
          {imagePreview ? (
            <div className={styles.imagePreview}>
              <Image
                src={imagePreview}
                alt="Logo preview"
                fill
                className={styles.previewImg}
                sizes="120px"
              />
              <button
                type="button"
                className={styles.removeImageBtn}
                onClick={handleRemoveImage}
                disabled={isSubmitting}
                aria-label="Remover logo"
              >
                ×
              </button>
            </div>
          ) : (
            <div className={styles.uploadPlaceholder}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                data-testid="restaurant-logo-input"
                onChange={handleImageChange}
                className={styles.fileInput}
                disabled={isSubmitting}
                aria-describedby="logo-hint"
              />
              <div className={styles.uploadIcon}>📷</div>
              <span className={styles.uploadText}>Clique para adicionar logo</span>
            </div>
          )}
        </div>
        <span id="logo-hint" className={styles.hint}>
          Opcional. Formatos aceitos: JPG, PNG, WebP
        </span>
      </div>

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
          {isSubmitting ? 'Salvando...' : mode === 'edit' ? 'Salvar' : 'Criar'}
        </button>
      </div>
    </form>
  );
}
