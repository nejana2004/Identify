-- Add cover_image column to boards table
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS cover_image TEXT;

-- Create boards storage bucket for cover images
INSERT INTO storage.buckets (id, name, public)
VALUES ('boards', 'boards', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to board images
CREATE POLICY "Public can view board images" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'boards');

-- Allow authenticated users to upload board images
CREATE POLICY "Authenticated users can upload board images" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'boards');

-- Allow users to update their own board images
CREATE POLICY "Users can update own board images" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'boards');

-- Allow users to delete their own board images
CREATE POLICY "Users can delete own board images" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'boards');
