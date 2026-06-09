-- Drop and recreate views with proper column order and author_id redaction
DROP VIEW IF EXISTS public.forum_threads_secure;
DROP VIEW IF EXISTS public.forum_replies_secure;

CREATE VIEW public.forum_threads_secure
WITH (security_invoker = true)
AS
SELECT
  t.id, t.title, t.content,
  CASE WHEN t.is_anonymous = true AND auth.uid() IS DISTINCT FROM t.author_id THEN NULL ELSE t.author_id END AS author_id,
  CASE WHEN t.is_anonymous = true THEN NULL ELSE t.user_id END AS user_id,
  t.category_id, t.created_at, t.updated_at, t.is_pinned, t.is_locked, t.is_anonymous, t.edited_at
FROM public.forum_threads t;

CREATE VIEW public.forum_replies_secure
WITH (security_invoker = true)
AS
SELECT
  r.id, r.thread_id, r.content,
  CASE WHEN r.is_anonymous = true AND auth.uid() IS DISTINCT FROM r.author_id THEN NULL ELSE r.author_id END AS author_id,
  CASE WHEN r.is_anonymous = true THEN NULL ELSE r.user_id END AS user_id,
  r.created_at, r.updated_at, r.edited_at, r.is_solution, r.is_anonymous
FROM public.forum_replies r;

-- Drop the overly permissive storage upload policy
DROP POLICY IF EXISTS "Authenticated users can upload question images" ON storage.objects;