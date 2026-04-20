'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import type { products } from '@/lib/supabase/types'
import { uploadProductImage, deleteProductImage } from '@/lib/supabase/storage'
import styles from './ProductForm.module.css'

export interface ProductInput {
  category_id: string
  name: string
  description?: string
  image_url?: string
  price: number
  dietary_labels?: string[]
  available?: boolean
  sort_order?: number
}

interface ProductFormProps {
  product?: products
  categories: { id: string; name: string }[]
  onSubmit: (data: ProductInput) => void
  onCancel: () => void
}

export function ProductForm({ product, categories, onSubmit, onCancel }: ProductFormProps) {
  const isEditMode = Boolean(product)

  const [name, setName] = useState(product?.name ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [categoryId, setCategoryId] = useState(product?.category_id ?? categories[0]?.id ?? '')
  const [price, setPrice] = useState(product?.price?.toString() ?? '')
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? '')
  const [imagePreview, setImagePreview] = useState<string | null>(product?.image_url ?? null)
  const [dietaryLabels, setDietaryLabels] = useState<string[]>(product?.dietary_labels ?? [])
  const [available, setAvailable] = useState(product?.available ?? true)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [errors, setErrors] = useState<{ name?: string; price?: string; category?: string }>({})
  const [uploadError, setUploadError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const DIETARY_OPTIONS = ['vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'spicy', 'sweet', 'sour', 'bitter', 'umami']

  const toggleDietaryLabel = (label: string) => {
    setDietaryLabels(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    )
  }

  const validateForm = (): boolean => {
    const newErrors: { name?: string; price?: string; category?: string } = {}

    if (!name.trim()) {
      newErrors.name = 'Nome é obrigatório'
    }

    const priceNum = parseFloat(price)
    if (!price || isNaN(priceNum) || priceNum < 0) {
      newErrors.price = 'Preço inválido'
    }

    if (!categoryId) {
      newErrors.category = 'Categoria é obrigatória'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setUploadError('Por favor, selecione um arquivo de imagem')
      return
    }

    // Show local preview while uploading
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    setUploadError(null)
    setUploadProgress(0)

    try {
      const result = await uploadProductImage(file, {
        onProgress: ({ fraction }) => {
          setUploadProgress(fraction)
        },
      })
      setImageUrl(result.url)
      setUploadProgress(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload falhou'
      setUploadError(message)
      setImagePreview(null)
      setImageUrl('')
    }
  }

  const handleRemoveImage = async () => {
    if (imageUrl) {
      try {
        await deleteProductImage(imageUrl)
      } catch {
        // ignore delete errors
      }
    }
    setImagePreview(null)
    setImageUrl('')
    setUploadError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      await onSubmit({
        category_id: categoryId,
        name: name.trim(),
        description: description.trim() || undefined,
        image_url: imageUrl || undefined,
        price: parseFloat(price),
        dietary_labels: dietaryLabels.length > 0 ? dietaryLabels : undefined,
        available,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          {isEditMode ? 'Editar Produto' : 'Novo Produto'}
        </h2>
      </div>

      <div className={styles.field}>
        <label htmlFor="category" className={styles.label}>
          Categoria <span className={styles.required}>*</span>
        </label>
        <select
          id="category"
          className={`${styles.select} ${errors.category ? styles.inputError : ''}`}
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          disabled={isSubmitting}
        >
          <option value="">Selecione uma categoria</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
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
          className={`${styles.input} ${errors.price ? styles.inputError : ''}`}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0.00"
          disabled={isSubmitting}
        />
        {errors.price && <span className={styles.error}>{errors.price}</span>}
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

        {uploadProgress !== null && (
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${uploadProgress * 100}%` }}
            />
            <span className={styles.progressText}>{Math.round(uploadProgress * 100)}%</span>
          </div>
        )}

        {uploadError && <span className={styles.error}>{uploadError}</span>}
        <span className={styles.hint}>Formatos aceitos: JPG, PNG, WebP. Tamanho máximo: 5MB</span>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Informações Nutricionais</label>
        <div className={styles.dietaryGrid}>
          {DIETARY_OPTIONS.map(label => (
            <button
              key={label}
              type="button"
              className={`${styles.dietaryChip} ${dietaryLabels.includes(label) ? styles.dietaryChipActive : ''}`}
              onClick={() => toggleDietaryLabel(label)}
              disabled={isSubmitting}
            >
              {label.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

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
          className={styles.submitButton}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Salvando...' : isEditMode ? 'Salvar Alterações' : 'Criar Produto'}
        </button>
      </div>
    </form>
  )
}