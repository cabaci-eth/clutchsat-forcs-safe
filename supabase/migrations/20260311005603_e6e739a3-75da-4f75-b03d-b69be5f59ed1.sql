
-- Fix views to explicitly use security_invoker = true
DROP VIEW IF EXISTS public.forum_threads_secure;
CREATE VIEW public.forum_threads_secure
WITH (security_invoker = true) AS
SELECT
  id, title, content, category_id, created_at, updated_at, edited_at,
  is_pinned, is_locked, is_anonymous,
  CASE WHEN is_anonymous THEN NULL ELSE user_id END AS user_id,
  CASE WHEN is_anonymous THEN NULL ELSE author_id END AS author_id
FROM public.forum_threads;

DROP VIEW IF EXISTS public.forum_replies_secure;
CREATE VIEW public.forum_replies_secure
WITH (security_invoker = true) AS
SELECT
  id, thread_id, content, created_at, updated_at, edited_at,
  is_solution, is_anonymous,
  CASE WHEN is_anonymous THEN NULL ELSE user_id END AS user_id,
  CASE WHEN is_anonymous THEN NULL ELSE author_id END AS author_id
FROM public.forum_replies;
