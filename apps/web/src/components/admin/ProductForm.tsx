'use client';

import { useState } from 'react';

import { useImageUpload } from '../../hooks/useImageUpload';
import { useProductFormState } from '../../hooks/useProductFormState';

import { DietaryChips } from './DietaryChips';
import { ImageUploadField } from './ImageUploadField';
import styles from './ProductForm.module.css';

export interface ProductInput {
  category_id: string;
  name: string;
  description?: string;
  image_url?: string;
  price: number;
  dietary_labels?: string[];
  available?: boolean;
  sort_order?: number;
}

interface ProductFormProps {
  product?: any;
  categories: { id: string; name: string }[];
  onSubmit: (data: ProductInput) => void;
  onCancel: () => void;
}

export function ProductForm({ product, categories, onSubmit, onCancel }: ProductFormProps) {
  const isEditMode = Boolean(product);

  const {
    name,
    description,
    categoryId,
    price,
    dietaryLabels,
    available,
    errors,
    setName,
    setDescription,
    setCategoryId,
    setPrice,
    setAvailable,
    toggleDietaryLabel,
    validateForm,
  } = useProductFormState(product, categories[0]?.id);

  const {
    imageUrl,
    imagePreview,
    uploadProgress,
    uploadError,
    fileInputRef,
    handleImageChange,
    handleRemoveImage,
  } = useImageUpload(product?.image_url);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        category_id: categoryId,
        name: name.trim(),
        description: description.trim() || undefined,
        image_url: imageUrl || undefined,
        price: parseFloat(price),
        dietary_labels: dietaryLabels.length > 0 ? dietaryLabels : undefined,
        available,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.header}>
        <h2 className={styles.title}>{isEditMode ? 'Editar Produto' : 'Novo Produto'}</h2>
      </div>

      <div className={styles.field}>
        <label htmlFor="category" className={styles.label}>
          Categoria <span className={styles.required}>*</span>
        </label>
        <select
          id="category"
          data-testid="product-category-select"
          className={`${styles.select} ${errors.category ? styles.inputError : ''}`}
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          disabled={isSubmitting}
        >
          <option value="">Selecione uma categoria</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        {errors.category && <span className={styles.error}>{errors.category}</span>}
      </div>

      <div className={styles.field}>
        <label htmlFor="name" className={styles.label}>
          Nome <span className={styles.required}>*</span>
        </label>
        <input
          id="name"
          type="text"
          data-testid="product-name-input"
          className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: X-Burger, Suco de Laranja"
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
          data-testid="product-description-input"
          className={styles.textarea}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descrição opcional do produto"
          rows={3}
          disabled={isSubmitting}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="price" className={styles.label}>
          Preço (R$) <span className={styles.required}>*</span>
        </label>
        <input
          id="price"
          type="number"
          step="0.01"
          min="0"
          data-testid="product-price-input"
          className={`${styles.input} ${errors.price ? styles.inputError : ''}`}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0.00"
          disabled={isSubmitting}
        />
        {errors.price && <span className={styles.error}>{errors.price}</span>}
      </div>

      <ImageUploadField
        imagePreview={imagePreview}
        uploadProgress={uploadProgress}
        uploadError={uploadError}
        fileInputRef={fileInputRef}
        onImageChange={handleImageChange}
        onRemoveImage={handleRemoveImage}
        disabled={isSubmitting}
      />

      <DietaryChips
        selectedLabels={dietaryLabels}
        onToggle={toggleDietaryLabel}
        disabled={isSubmitting}
      />

      <div className={styles.field}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={available}
            onChange={(e) => setAvailable(e.target.checked)}
            disabled={isSubmitting}
          />
          <span>Produto disponível</span>
        </label>
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
          data-testid="save-button"
          className={styles.submitButton}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Salvando...' : isEditMode ? 'Salvar Alterações' : 'Criar Produto'}
        </button>
      </div>
    </form>
  );
}
