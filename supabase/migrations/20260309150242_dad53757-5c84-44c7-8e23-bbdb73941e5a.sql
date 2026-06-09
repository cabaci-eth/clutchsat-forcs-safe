
-- Revert: set user_id back to author_id for all rows (undo sentinel approach)
UPDATE public.forum_threads SET user_id = author_id WHERE user_id = '00000000-0000-0000-0000-000000000000'::uuid;
UPDATE public.forum_replies SET user_id = author_id WHERE user_id = '00000000-0000-0000-0000-000000000000'::uuid;

-- Drop the trigger that sets sentinel UUID (bad approach with FKs)
DROP TRIGGER IF EXISTS trg_set_thread_author ON public.forum_threads;
DROP TRIGGER IF EXISTS trg_set_reply_author ON public.forum_replies;
DROP FUNCTION IF EXISTS public.set_forum_author_id();

-- Instead, create secure views that redact user_id for anonymous posts
CREATE OR REPLACE VIEW public.forum_threads_secure AS
SELECT 
  id, title, content,
  CASE WHEN is_anonymous = true THEN NULL ELSE user_id END AS user_id,
  author_id,
  category_id, created_at, updated_at, is_locked, is_pinned, edited_at, is_anonymous
FROM public.forum_threads;

CREATE OR REPLACE VIEW public.forum_replies_secure AS
SELECT
  id, content,
  CASE WHEN is_anonymous = true THEN NULL ELSE user_id END AS user_id,
  author_id,
  thread_id, created_at, updated_at, edited_at, is_solution, is_anonymous
FROM public.forum_replies;

-- RLS INSERT policies should use author_id (already done), but let's also
-- restore the trigger to auto-populate author_id on insert without sentinel approach
CREATE OR REPLACE FUNCTION public.set_forum_author_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.author_id := NEW.user_id;
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
