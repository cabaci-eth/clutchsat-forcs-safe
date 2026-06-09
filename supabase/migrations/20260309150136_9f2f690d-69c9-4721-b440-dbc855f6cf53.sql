
-- Add author_id column to forum_threads (stores real owner, not exposed publicly)
ALTER TABLE public.forum_threads ADD COLUMN author_id uuid;
UPDATE public.forum_threads SET author_id = user_id;
ALTER TABLE public.forum_threads ALTER COLUMN author_id SET NOT NULL;

-- Add author_id column to forum_replies
ALTER TABLE public.forum_replies ADD COLUMN author_id uuid;
UPDATE public.forum_replies SET author_id = user_id;
ALTER TABLE public.forum_replies ALTER COLUMN author_id SET NOT NULL;

-- Create a trigger to auto-set author_id on insert for threads
CREATE OR REPLACE FUNCTION public.set_forum_author_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.author_id := NEW.user_id;
  -- If anonymous, nullify user_id so it's not exposed via public SELECT
  IF NEW.is_anonymous = true THEN
    NEW.user_id := '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_thread_author
  BEFORE INSERT ON public.forum_threads
  FOR EACH ROW
  EXECUTE FUNCTION public.set_forum_author_id();

CREATE TRIGGER trg_set_reply_author
  BEFORE INSERT ON public.forum_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.set_forum_author_id();

-- Now anonymize existing anonymous posts
UPDATE public.forum_threads SET user_id = '00000000-0000-0000-0000-000000000000'::uuid WHERE is_anonymous = true;
UPDATE public.forum_replies SET user_id = '00000000-0000-0000-0000-000000000000'::uuid WHERE is_anonymous = true;

-- Update RLS policies to use author_id for ownership checks
DROP POLICY IF EXISTS "Users can update own threads" ON public.forum_threads;
CREATE POLICY "Users can update own threads" ON public.forum_threads
  FOR UPDATE TO public USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can delete own threads" ON public.forum_threads;
CREATE POLICY "Users can delete own threads" ON public.forum_threads
  FOR DELETE TO public USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can update own replies" ON public.forum_replies;
CREATE POLICY "Users can update own replies" ON public.forum_replies
  FOR UPDATE TO public USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can delete own replies" ON public.forum_replies;
CREATE POLICY "Users can delete own replies" ON public.forum_replies
  FOR DELETE TO public USING (auth.uid() = author_id);

-- Update INSERT policies to use author_id
DROP POLICY IF EXISTS "Authenticated users can create threads" ON public.forum_threads;
CREATE POLICY "Authenticated users can create threads" ON public.forum_threads
  FOR INSERT TO public WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authenticated users can create replies" ON public.forum_replies;
CREATE POLICY "Authenticated users can create replies" ON public.forum_replies
  FOR INSERT TO public WITH CHECK (auth.uid() = author_id);

-- Update vote ownership policies (votes use user_id directly, not affected)
