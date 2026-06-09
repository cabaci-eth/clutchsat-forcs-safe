
-- Drop the old public SELECT policy if it exists
DROP POLICY IF EXISTS "Question images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Give public access to images" ON storage.objects;

-- Create authenticated-only read policy
CREATE POLICY "Authenticated users can view question images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'question-images' 
  AND auth.role() = 'authenticated'
);
