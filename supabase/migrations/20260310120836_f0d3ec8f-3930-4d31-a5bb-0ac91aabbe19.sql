-- Allow all users to read/download question images (needed for signed URL generation)
CREATE POLICY "Anyone can view question images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'question-images');