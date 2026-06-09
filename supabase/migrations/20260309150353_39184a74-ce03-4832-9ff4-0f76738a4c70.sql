
-- Fix views to use SECURITY INVOKER (the default for views in newer Postgres)
-- Drop and recreate with explicit security_invoker
DROP VIEW IF EXISTS public.forum_threads_secure;
DROP VIEW IF EXISTS public.forum_replies_secure;

CREATE VIEW public.forum_threads_secure 
WITH (security_invoker = true)
AS
SELECT 
  id, title, content,
  CASE WHEN is_anonymous = true THEN NULL ELSE user_id END AS user_id,
  author_id,
  category_id, created_at, updated_at, is_locked, is_pinned, edited_at, is_anonymous
FROM public.forum_threads;

CREATE VIEW public.forum_replies_secure
WITH (security_invoker = true)
AS
SELECT
  id, content,
  CASE WHEN is_anonymous = true THEN NULL ELSE user_id END AS user_id,
  author_id,
  thread_id, created_at, updated_at, edited_at, is_solution, is_anonymous
FROM public.forum_replies;
