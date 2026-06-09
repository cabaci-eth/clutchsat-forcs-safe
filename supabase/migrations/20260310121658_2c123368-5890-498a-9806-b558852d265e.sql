DROP VIEW IF EXISTS public.forum_threads_secure;
DROP VIEW IF EXISTS public.forum_replies_secure;

CREATE VIEW public.forum_threads_secure
WITH (security_invoker=false)
AS
SELECT
  id, title, content,
  CASE WHEN is_anonymous = true AND auth.uid() IS DISTINCT FROM author_id THEN NULL::uuid ELSE author_id END AS author_id,
  CASE WHEN is_anonymous = true AND auth.uid() IS DISTINCT FROM author_id THEN NULL::uuid ELSE user_id END AS user_id,
  category_id, created_at, updated_at, is_pinned, is_locked, is_anonymous, edited_at
FROM forum_threads;

CREATE VIEW public.forum_replies_secure
WITH (security_invoker=false)
AS
SELECT
  id, thread_id, content,
  CASE WHEN is_anonymous = true AND auth.uid() IS DISTINCT FROM author_id THEN NULL::uuid ELSE author_id END AS author_id,
  CASE WHEN is_anonymous = true AND auth.uid() IS DISTINCT FROM author_id THEN NULL::uuid ELSE user_id END AS user_id,
  created_at, updated_at, edited_at, is_solution, is_anonymous
FROM forum_replies;