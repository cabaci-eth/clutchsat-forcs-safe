-- Add bio and last_username_change columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS last_username_change TIMESTAMP WITH TIME ZONE;

-- Add unique constraint on username (if not already)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_username_unique'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_unique UNIQUE (username);
  END IF;
END $$;

-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg','image/png','image/gif','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Database function to enforce username change cooldown
CREATE OR REPLACE FUNCTION public.validate_username_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If username is being changed
  IF OLD.username IS DISTINCT FROM NEW.username AND OLD.username IS NOT NULL THEN
    -- Check 7-day cooldown
    IF OLD.last_username_change IS NOT NULL 
       AND (now() - OLD.last_username_change) < interval '7 days' THEN
      RAISE EXCEPTION 'Username can only be changed once every 7 days. Next change available after %', 
        OLD.last_username_change + interval '7 days';
    END IF;
    NEW.last_username_change := now();
  END IF;
  
  -- If setting username for first time, record the timestamp
  IF OLD.username IS NULL AND NEW.username IS NOT NULL THEN
    NEW.last_username_change := now();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_username_change_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.validate_username_change();