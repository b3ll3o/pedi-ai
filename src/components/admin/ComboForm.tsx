'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import type { combos, combo_items } from '@/lib/supabase/types'
import { uploadProductImage, deleteProductImage } from '@/lib/supabase/storage'
import styles from './ComboForm.module.css'

export interface ComboInput {
  name: string
  description?: string
  bundle_price: number
  image_url?: string
  available?: boolean
  product_ids: string[]
}

interface ComboFormProps {
  combo?: combos & { combo_items?: combo_items[] }
  products: { id: string; name: string; price: number }[]
  onSubmit: (data: ComboInput) => void
  onCancel: () => void
}

export function ComboForm({ combo, products, onSubmit, onCancel }: ComboFormProps) {
  const isEditMode = Boolean(combo)

  const [name, setName] = useState(combo?.name ?? '')
  const [description, setDescription] = useState(combo?.description ?? '')
  const [bundlePrice, setBundlePrice] = useState(combo?.bundle_price?.toString() ?? '')
  const [imageUrl, setImageUrl] = useState(combo?.image_url ?? '')
  const [imagePreview, setImagePreview] = useState<string | null>(combo?.image_url ?? null)
  const [available, setAvailable] = useState(combo?.available ?? true)

  // Map existing combo_items to product selections
  const [selectedProducts, setSelectedProducts] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    combo?.combo_items?.forEach(item => {
      initial[item.product_id] = item.quantity
    })
    return initial
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [errors, setErrors] = useState<{ name?: string; bundle_price?: string; items?: string }>({})
  const [uploadError, setUploadError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateForm = (): boolean => {
    const newErrors: { name?: string; bundle_price?: string; items?: string } = {}

    if (!name.trim()) {
      newErrors.name = 'Nome é obrigatório'
    }

    const priceNum = parseFloat(bundlePrice)
    if (!bundlePrice || isNaN(priceNum) || priceNum < 0) {
      newErrors.bundle_price = 'Preço inválido'
    }

    const productEntries = Object.entries(selectedProducts).filter(([, qty]) => qty > 0)
    if (productEntries.length === 0) {
      newErrors.items = 'Adicione pelo menos um produto ao combo'
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

  const handleQuantityChange = (productId: string, quantity: number) => {
    setSelectedProducts(prev => {
      const updated = { ...prev }
      if (quantity <= 0) {
        delete updated[productId]
      } else {
        updated[productId] = quantity
      }
      return updated
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const product_ids = Object.entries(selectedProducts)
        .filter(([, qty]) => qty > 0)
        .map(([product_id]) => product_id)

      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        bundle_price: parseFloat(bundlePrice),
        image_url: imageUrl || undefined,
        available,
        product_ids,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const productEntries = Object.entries(selectedProducts).filter(([, qty]) => qty > 0)
  const totalValue = productEntries.reduce((sum, [productId, qty]) => {
    const product = products.find(p => p.id === productId)
    return sum + (product ? product.price * qty : 0)
  }, 0)

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          {isEditMode ? 'Editar Combo' : 'Novo Combo'}
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
          placeholder="Ex: Combo Família, Combo Burger"
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
          placeholder="Descrição opcional do combo"
          rows={3}
          disabled={isSubmitting}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="bundlePrice" className={styles.label}>
          Preço do Bundle (R$) <span className={styles.required}>*</span>
        </label>
        <input
          id="bundlePrice"
          type="number"
          step="0.01"
          min="0"
          className={`${styles.input} ${errors.bundle_price ? styles.inputError : ''}`}
          value={bundlePrice}
          onChange={(e) => setBundlePrice(e.target.value)}
          placeholder="0.00"
          disabled={isSubmitting}
        />
        {errors.bundle_price && <span className={styles.error}>{errors.bundle_price}</span>}
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
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={available}
            onChange={(e) => setAvailable(e.target.checked)}
            disabled={isSubmitting}
          />
          <span>Combo disponível</span>
        </label>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>
          Produtos <span className={styles.required}>*</span>
        </label>
        {errors.items && <span className={styles.error}>{errors.items}</span>}

        <div className={styles.productsList}>
          {products.map(product => {
            const quantity = selectedProducts[product.id] ?? 0
            return (
              <div key={product.id} className={styles.productRow}>
                <span className={styles.productName}>{product.name}</span>
                <span className={styles.productPrice}>R$ {product.price.toFixed(2)}</span>
                <div className={styles.quantityControls}>
                  <button
                    type="button"
                    className={styles.qtyButton}
                    onClick={() => handleQuantityChange(product.id, quantity - 1)}
                    disabled={isSubmitting || quantity <= 0}
                  >
                    −
                  </button>
                  <span className={styles.qtyValue}>{quantity}</span>
                  <button
                    type="button"
                    className={styles.qtyButton}
                    onClick={() => handleQuantityChange(product.id, quantity + 1)}
                    disabled={isSubmitting}
                  >
                    +
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {productEntries.length > 0 && (
          <div className={styles.totalRow}>
            <span>Valor total dos itens:</span>
            <span className={styles.totalValue}>R$ {totalValue.toFixed(2)}</span>
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
          {isSubmitting ? 'Salvando...' : isEditMode ? 'Salvar Alterações' : 'Criar Combo'}
        </button>
      </div>
    </form>
  )
}