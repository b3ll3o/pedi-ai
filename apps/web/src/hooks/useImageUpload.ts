'use client';

import { useState, useRef, useCallback } from 'react';

interface UploadResult {
  url: string;
}

async function uploadProductImage(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/upload/image', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = 'Upload falhou';
    try {
      const data = await response.json();
      errorMessage = data.error || errorMessage;
    } catch {
      errorMessage = `Upload falhou: ${response.status}`;
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return { url: data.url };
}

async function deleteProductImage(url: string): Promise<void> {
  if (!url || !url.startsWith('/uploads/')) return;

  const encodedUrl = encodeURIComponent(url);
  const response = await fetch(`/api/upload/image?url=${encodedUrl}`, { method: 'DELETE' });

  if (!response.ok) {
    throw new Error('Falha ao remover imagem');
  }
}

interface UseImageUploadReturn {
  imageUrl: string;
  imagePreview: string | null;
  uploadProgress: number | null;
  uploadError: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleRemoveImage: () => Promise<void>;
}

export function useImageUpload(initialUrl?: string): UseImageUploadReturn {
  const [imageUrl, setImageUrl] = useState(initialUrl ?? '');
  const [imagePreview, setImagePreview] = useState<string | null>(initialUrl ?? null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Por favor, selecione um arquivo de imagem');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setUploadError(null);
    setUploadProgress(0.1);

    try {
      const result = await uploadProductImage(file);
      setImageUrl(result.url);
      setUploadProgress(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload falhou';
      setUploadError(message);
      setImagePreview(null);
      setImageUrl('');
    }
  }, []);

  const handleRemoveImage = useCallback(async () => {
    if (imageUrl) {
      try {
        await deleteProductImage(imageUrl);
      } catch {
        // ignore delete errors
      }
    }
    setImagePreview(null);
    setImageUrl('');
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [imageUrl]);

  return {
    imageUrl,
    imagePreview,
    uploadProgress,
    uploadError,
    fileInputRef,
    handleImageChange,
    handleRemoveImage,
  };
}
