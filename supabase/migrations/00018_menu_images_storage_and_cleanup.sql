-- ============================================================================
-- Migration 00018: Menu Images Storage Setup and Base64 Cleanup
-- ============================================================================

-- 1. Create or ensure public storage bucket for menu-images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'menu-images',
  'menu-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Drop any previous restrictive storage policies for menu-images
DROP POLICY IF EXISTS "Authenticated users can upload menu images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update menu images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete menu images" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for menu images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads for menu images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates for menu images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read for menu images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete for menu images" ON storage.objects;

-- 3. Create permissive storage policies for menu images (Public/Anon app usage)
CREATE POLICY "Allow public uploads for menu images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'menu-images');

CREATE POLICY "Allow public updates for menu images"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'menu-images');

CREATE POLICY "Allow public delete for menu images"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'menu-images');

CREATE POLICY "Allow public read for menu images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'menu-images');

-- 4. Clean up oversized Base64 data URIs from menu_items table to restore instant query performance
UPDATE menu_items
SET image_url = NULL
WHERE image_url LIKE 'data:%';
