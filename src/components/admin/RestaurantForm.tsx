'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import type { restaurants } from '@/lib/supabase/types';
import styles from './RestaurantForm.module.css';

export interface RestaurantInput {
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  logo_url?: string;
}

interface RestaurantFormProps {
  restaurant?: restaurants;
  onSubmit: (data: RestaurantInput) => Promise<void>;
  onCancel: () => void;
}

export function RestaurantForm({ restaurant, onSubmit, onCancel }: RestaurantFormProps) {
  const isEditMode = Boolean(restaurant);

  const [name, setName] = useState(restaurant?.name ?? '');
  const [description, setDescription] = useState(restaurant?.description ?? '');
  const [address, setAddress] = useState(restaurant?.address ?? '');
  const [phone, setPhone] = useState(restaurant?.phone ?? '');
  const [logoUrl, setLogoUrl] = useState(restaurant?.logo_url ?? '');
  const [imagePreview, setImagePreview] = useState<string | null>(restaurant?.logo_url ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateForm = (): boolean => {
    const newErrors: { name?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
    // In production, upload to storage and get URL
    setLogoUrl('');
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setLogoUrl('');
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
        name: name.trim(),
        description: description.trim() || undefined,
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        logo_url: logoUrl || undefined,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar restaurante';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          {isEditMode ? 'Editar Restaurante' : 'Novo Restaurante'}
        </h2>
      </div>

      <div className={styles.field}>
        <label htmlFor="name" className={styles.label}>
          Nome <span className={styles.required}>*</span>
        </label>
        <input
          id="name"
          type="text"
          data-testid="restaurant-name-input"
          className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Restaurante Central"
          disabled={isSubmitting}
        />
        {errors.name && <span className={styles.error}>{errors.name}</span>}
      </div>

      <div className={styles.field}>
        <label htmlFor="description" className={styles.label}>
          Descrição
        </label>
        <textarea
          id="description"
          data-testid="restaurant-description-input"
          className={styles.textarea}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Breve descrição do restaurante"
          rows={2}
          disabled={isSubmitting}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="address" className={styles.label}>
          Endereço
        </label>
        <textarea
          id="address"
          data-testid="restaurant-address-input"
          className={styles.textarea}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Endereço completo do restaurante"
          rows={2}
          disabled={isSubmitting}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="phone" className={styles.label}>
          Telefone
        </label>
        <input
          id="phone"
          type="tel"
          data-testid="restaurant-phone-input"
          className={styles.input}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(XX) XXXXX-XXXX"
          disabled={isSubmitting}
        />
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
              />
              <div className={styles.uploadIcon}>📷</div>
              <span className={styles.uploadText}>Clique para adicionar logo</span>
            </div>
          )}
        </div>
        <span className={styles.hint}>Opcional. Formatos aceitos: JPG, PNG, WebP</span>
      </div>

      {submitError && <span className={styles.error}>{submitError}</span>}

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
          {isSubmitting ? 'Salvando...' : isEditMode ? 'Salvar' : 'Criar'}
        </button>
      </div>
    </form>
  );
}
