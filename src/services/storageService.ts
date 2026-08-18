/**
 * Storage service for uploading and managing files in Supabase Storage.
 */
import { supabase } from 'src/services/supabase';

const BUCKET_NAME = 'menu-images';

/**
 * Convert a File object to a Base64 string as a reliable fallback.
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Upload a menu item image file to Supabase Storage.
 * If the bucket is not created in Supabase yet, attempts to create it or falls back safely.
 * @param file - The image File object to upload
 * @returns Public URL or Data URL of the uploaded image
 */
export async function uploadMenuImage(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop() || 'jpg';
  const cleanExt = fileExt.toLowerCase().replace(/[^a-z0-9]/g, '');
  const fileName = `item-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${cleanExt}`;
  const filePath = `items/${fileName}`;

  try {
    // 1. Try uploading to Supabase Storage
    let { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

    // 2. If bucket doesn't exist, try creating it automatically
    if (
      uploadError &&
      (uploadError.message?.includes('Bucket not found') ||
        (uploadError as { error?: string })?.error?.includes('Bucket not found'))
    ) {
      console.warn('Storage bucket not found, attempting to create bucket:', BUCKET_NAME);
      try {
        await supabase.storage.createBucket(BUCKET_NAME, { public: true });
        const retryResult = await supabase.storage.from(BUCKET_NAME).upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });
        uploadError = retryResult.error;
      } catch (createErr) {
        console.warn('Auto bucket creation skipped (requires SQL migration):', createErr);
      }
    }

    // 3. If upload succeeded, return public URL
    if (!uploadError) {
      const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
      return data.publicUrl;
    }

    console.warn('Supabase storage upload failed, using Data URL fallback:', uploadError);
    // Fallback: Use Base64 Data URL so the menu item is still saved with image
    return await fileToBase64(file);
  } catch (err) {
    console.warn('Falling back to Base64 image:', err);
    return await fileToBase64(file);
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
