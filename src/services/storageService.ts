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
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.8,
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

      const mimeType = 'image/webp';
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
export async function uploadMenuImage(
  file: File,
): Promise<{ imageUrl: string; thumbPath: string }> {
  const id = crypto.randomUUID();
  const imagePath = `items/${id}.webp`;
  const thumbPath = `items/thumb/${id}.webp`;
  const [image, thumb] = await Promise.all([
    compressImage(file, 1600, 1600, 0.8),
    compressImage(file, 320, 320, 0.8),
  ]);
  const bucket = supabase.storage.from(BUCKET_NAME);
  const options = { cacheControl: '31536000', contentType: 'image/webp', upsert: false };
  const { error: imageError } = await bucket.upload(imagePath, image.blob, options);
  if (imageError) throw imageError;
  const { error: thumbError } = await bucket.upload(thumbPath, thumb.blob, options);
  if (thumbError) throw thumbError;
  return { imageUrl: bucket.getPublicUrl(imagePath).data.publicUrl, thumbPath };
}

/**
 * Convert a File object to a local object URL for instant preview before upload.
 * @param file - The File object
 * @returns Temporary object URL for preview
 */
export function createLocalPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}
