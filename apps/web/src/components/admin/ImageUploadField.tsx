'use client';

import Image from 'next/image';

import styles from './ProductForm.module.css';

interface ImageUploadFieldProps {
  imagePreview: string | null;
  uploadProgress: number | null;
  uploadError: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onRemoveImage: () => void;
  disabled?: boolean;
}

export function ImageUploadField({
  imagePreview,
  uploadProgress,
  uploadError,
  fileInputRef,
  onImageChange,
  onRemoveImage,
  disabled,
}: ImageUploadFieldProps) {
  return (
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
              onClick={onRemoveImage}
              disabled={disabled}
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
              data-testid="product-image-input"
              onChange={onImageChange}
              className={styles.fileInput}
              disabled={disabled}
            />
            <div className={styles.uploadIcon}>📷</div>
            <span className={styles.uploadText}>Clique para adicionar imagem</span>
          </div>
        )}
      </div>

      {uploadProgress !== null && (
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${uploadProgress * 100}%` }} />
          <span className={styles.progressText}>{Math.round(uploadProgress * 100)}%</span>
        </div>
      )}

      {uploadError && <span className={styles.error}>{uploadError}</span>}
      <span className={styles.hint}>Formatos aceitos: JPG, PNG, WebP. Tamanho máximo: 5MB</span>
    </div>
  );
}
