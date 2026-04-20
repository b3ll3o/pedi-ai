import { createClient } from './client'

const BUCKET = 'product-images'

export interface UploadResult {
  url: string
  error?: never
}

export interface UploadProgress {
  fraction: number // 0-1
}

/**
 * Upload image file to Supabase Storage 'product-images' bucket.
 * Returns public URL on success.
 */
export async function uploadProductImage(
  file: File | ArrayBuffer,
  options?: {
    onProgress?: (progress: UploadProgress) => void
    path?: string // optional custom path within bucket
  }
): Promise<UploadResult> {
  const supabase = createClient()

  const ext = file instanceof File
    ? file.name.split('.').pop() ?? 'jpg'
    : 'jpg'

  const path = options?.path ?? `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  let arrayBuffer: ArrayBuffer
  if (file instanceof File) {
    arrayBuffer = await file.arrayBuffer()
  } else {
    arrayBuffer = file
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, {
      contentType: file instanceof File ? file.type : 'image/jpeg',
      upsert: true,
    })

  if (error) {
    console.error('Supabase storage upload error:', error)
    throw new Error(`Upload failed: ${error.message}`)
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path)

  return { url: urlData.publicUrl }
}

/**
 * Delete product image from Supabase Storage.
 */
export async function deleteProductImage(publicUrl: string): Promise<void> {
  const supabase = createClient()

  // Extract path from public URL
  // URL format: https://xxx.supabase.co/storage/v1/object/public/product-images/path
  const path = publicUrl.split('/storage/v1/object/public/product-images/')[1]
  if (!path) return

  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) {
    console.error('Supabase storage delete error:', error)
  }
}