
-- Add forum columns for edit/anonymous support
ALTER TABLE forum_threads ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE forum_threads ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;
ALTER TABLE forum_replies ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE forum_replies ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;

-- Add content length constraints for security
ALTER TABLE forum_threads DROP CONSTRAINT IF EXISTS thread_title_length;
ALTER TABLE forum_threads ADD CONSTRAINT thread_title_length CHECK (char_length(title) BETWEEN 1 AND 200);
ALTER TABLE forum_threads DROP CONSTRAINT IF EXISTS thread_content_length;
ALTER TABLE forum_threads ADD CONSTRAINT thread_content_length CHECK (char_length(content) BETWEEN 1 AND 10000);
ALTER TABLE forum_replies DROP CONSTRAINT IF EXISTS reply_content_length;
ALTER TABLE forum_replies ADD CONSTRAINT reply_content_length CHECK (char_length(content) BETWEEN 1 AND 5000);

-- Storage RLS: Allow authenticated users to upload to question-images bucket
CREATE POLICY "Authenticated users can upload question images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'question-images');

-- Allow public read on question-images
CREATE POLICY "Public read access for question images"
ON storage.objects FOR SELECT
USING (bucket_id = 'question-images');

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Users can delete own question images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'question-images' AND (storage.foldername(name))[1] = auth.uid()::text);
