'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import type { categories } from '@/lib/supabase/types';
import styles from './CategoryForm.module.css';

export interface CategoryInput {
  name: string;
  description?: string;
  image_url?: string;
}

interface CategoryFormProps {
  category?: categories;
  onSubmit: (data: CategoryInput) => void;
  onCancel: () => void;
}

export function CategoryForm({ category, onSubmit, onCancel }: CategoryFormProps) {
  const isEditMode = Boolean(category);
  const [name, setName] = useState(category?.name ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  const [imageUrl, setImageUrl] = useState(category?.image_url ?? '');
  const [imagePreview, setImagePreview] = useState<string | null>(category?.image_url ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateForm = (): boolean => {
    const newErrors: { name?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        image_url: imageUrl.trim() || undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione um arquivo de imagem');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      // In a real implementation, you would upload the file to storage
      // and get the URL back. For now, we use a local object URL.
      setImageUrl('');
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setImageUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          {isEditMode ? 'Editar Categoria' : 'Nova Categoria'}
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
          placeholder="Ex: Lanches, Bebidas, Sobremesas"
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
          className={styles.textarea}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descrição opcional da categoria"
          rows={3}
          disabled={isSubmitting}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Imagem</label>
        <div className={styles.imageUpload}>
          {imagePreview ? (
            <div className={styles.imagePreview}>
              <Image
                src={imagePreview}
                alt="Preview"
                fill
                className={styles.previewImg}
                sizes="200px"
              />
              <button
                type="button"
                className={styles.removeImageBtn}
                onClick={handleRemoveImage}
                disabled={isSubmitting}
                aria-label="Remover imagem"
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
                onChange={handleImageChange}
                className={styles.fileInput}
                disabled={isSubmitting}
              />
              <div className={styles.uploadIcon}>📷</div>
              <span className={styles.uploadText}>Clique para adicionar imagem</span>
            </div>
          )}
        </div>
        <span className={styles.hint}>Formatos aceitos: JPG, PNG, WebP. Tamanho máximo: 5MB</span>
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
          {isSubmitting ? 'Salvando...' : isEditMode ? 'Salvar Alterações' : 'Criar Categoria'}
        </button>
      </div>
    </form>
  );
}
