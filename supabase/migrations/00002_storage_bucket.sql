-- ─── Storage Bucket for Menu Images ──────────────────────────────────────────

-- Create public bucket for menu images if it does not exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow authenticated users (restaurant owners) to upload menu images
CREATE POLICY "Authenticated users can upload menu images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'menu-images');

-- Allow authenticated users to update their menu images
CREATE POLICY "Authenticated users can update menu images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'menu-images');

-- Allow authenticated users to delete menu images
CREATE POLICY "Authenticated users can delete menu images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'menu-images');

-- Allow public read access to all menu images
CREATE POLICY "Public read access for menu images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'menu-images');
