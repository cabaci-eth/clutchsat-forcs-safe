
-- 1. Drop the open SELECT policies on base tables
DROP POLICY IF EXISTS "Anyone can view threads" ON public.forum_threads;
DROP POLICY IF EXISTS "Anyone can view replies" ON public.forum_replies;

-- 2. Add restrictive SELECT policies: only owners and admins can read base tables directly
CREATE POLICY "Owner can select own threads"
ON public.forum_threads FOR SELECT
TO authenticated
USING (auth.uid() = author_id);

CREATE POLICY "Owner can select own replies"
ON public.forum_replies FOR SELECT
TO authenticated
USING (auth.uid() = author_id);

-- 3. Recreate secure views with security_invoker = false (SECURITY DEFINER)
-- so the view owner can read the base tables on behalf of any caller
DROP VIEW IF EXISTS public.forum_threads_secure;
CREATE VIEW public.forum_threads_secure
WITH (security_invoker = false)
AS
SELECT
  id, title, content, category_id,
  created_at, updated_at, edited_at,
  is_pinned, is_locked, is_anonymous,
  CASE WHEN is_anonymous = true THEN NULL ELSE user_id END AS user_id,
  CASE WHEN is_anonymous = true THEN NULL ELSE author_id END AS author_id
FROM public.forum_threads;

DROP VIEW IF EXISTS public.forum_replies_secure;
CREATE VIEW public.forum_replies_secure
WITH (security_invoker = false)
AS
SELECT
  id, thread_id, content,
  created_at, updated_at, edited_at,
  is_anonymous, is_solution,
  CASE WHEN is_anonymous = true THEN NULL ELSE user_id END AS user_id,
  CASE WHEN is_anonymous = true THEN NULL ELSE author_id END AS author_id
FROM public.forum_replies;

-- 4. Grant SELECT on secure views to anon and authenticated
GRANT SELECT ON public.forum_threads_secure TO anon, authenticated;
GRANT SELECT ON public.forum_replies_secure TO anon, authenticated;
