'use client';

import Image from 'next/image';

import styles from './RestaurantForm.module.css';

interface LogoUploadFieldProps {
  imagePreview: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
  isSubmitting: boolean;
}

export function LogoUploadField({
  imagePreview,
  fileInputRef,
  onImageChange,
  onRemoveImage,
  isSubmitting,
}: LogoUploadFieldProps) {
  return (
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
              onClick={onRemoveImage}
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
              onChange={onImageChange}
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
  );
}
