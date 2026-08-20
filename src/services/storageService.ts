/**
 * Storage service for uploading and managing files in Supabase Storage with client-side compression.
 */
import { supabase } from 'src/services/supabase';

const BUCKET_NAME = 'menu-images';

/**
 * Compress and resize an image file using browser Canvas before uploading.
 * Reduces 5MB+ images down to ~50-100KB for lightning-fast loads.
 */
export async function compressImage(
  file: File,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.82,
): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;

      // Scale down proportionally
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context not supported'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Export as compressed WebP or JPEG
      const mimeType = 'image/jpeg';
      const dataUrl = canvas.toDataURL(mimeType, quality);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({ blob, dataUrl });
          } else {
            reject(new Error('Failed to compress image to Blob'));
          }
        },
        mimeType,
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for compression'));
    };

    img.src = objectUrl;
  });
}

/**
 * Upload a menu item image file to Supabase Storage with automatic compression.
 * @param file - The image File object to upload
 * @returns Public URL or compressed Data URL of the uploaded image
 */
export async function uploadMenuImage(file: File): Promise<string> {
  const fileName = `item-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.jpg`;
  const filePath = `items/${fileName}`;

  try {
    // 1. Compress image before uploading
    const { blob, dataUrl } = await compressImage(file, 800, 800, 0.82);

    // 2. Try uploading compressed blob to Supabase Storage
    const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(filePath, blob, {
      cacheControl: '31536000',
      contentType: 'image/jpeg',
      upsert: true,
    });

    // 3. If upload succeeded, return public URL
    if (!uploadError) {
      const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
      return data.publicUrl;
    }

    console.warn('Supabase storage upload failed, using compressed Data URL fallback:', uploadError);
    // Fallback: Use compressed Data URL (small ~50KB) instead of multi-MB raw file
    return dataUrl;
  } catch (err) {
    console.warn('Compression or upload failed, attempting small thumbnail fallback:', err);
    try {
      const { dataUrl } = await compressImage(file, 400, 400, 0.6);
      return dataUrl;
    } catch {
      return '';
    }
  }
}

/**
 * Convert a File object to a local object URL for instant preview before upload.
 * @param file - The File object
 * @returns Temporary object URL for preview
 */
export function createLocalPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

