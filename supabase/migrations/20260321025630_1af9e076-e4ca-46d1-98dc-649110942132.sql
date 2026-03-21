-- Create storage bucket for entry photos
INSERT INTO storage.buckets (id, name, public) VALUES ('entry-photos', 'entry-photos', true);

-- Allow authenticated users to upload photos
CREATE POLICY "Users can upload their own photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'entry-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to view their own photos
CREATE POLICY "Users can view their own photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'entry-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to delete their own photos
CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'entry-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read access for entry photos (since bucket is public)
CREATE POLICY "Public can view entry photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'entry-photos');

-- Add photo_urls column to log_entries
ALTER TABLE public.log_entries ADD COLUMN photo_urls text[] DEFAULT '{}';