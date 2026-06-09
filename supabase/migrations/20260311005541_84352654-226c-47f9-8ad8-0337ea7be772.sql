
-- =============================================
-- 1. Fix forum_threads RLS: replace restrictive policies with permissive ones
-- =============================================
DROP POLICY IF EXISTS "Admins can manage all threads" ON public.forum_threads;
DROP POLICY IF EXISTS "Authenticated users can create threads" ON public.forum_threads;
DROP POLICY IF EXISTS "Users can delete own threads" ON public.forum_threads;
DROP POLICY IF EXISTS "Users can update own threads" ON public.forum_threads;
DROP POLICY IF EXISTS "Users can view own threads" ON public.forum_threads;

CREATE POLICY "Anyone can view threads" ON public.forum_threads FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create threads" ON public.forum_threads FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can update own threads" ON public.forum_threads FOR UPDATE TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "Users can delete own threads" ON public.forum_threads FOR DELETE TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "Admins can manage all threads" ON public.forum_threads FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 2. Fix forum_replies RLS: replace restrictive policies with permissive ones
-- =============================================
DROP POLICY IF EXISTS "Admins can manage all replies" ON public.forum_replies;
DROP POLICY IF EXISTS "Authenticated users can create replies" ON public.forum_replies;
DROP POLICY IF EXISTS "Users can delete own replies" ON public.forum_replies;
DROP POLICY IF EXISTS "Users can update own replies" ON public.forum_replies;
DROP POLICY IF EXISTS "Users can view own replies" ON public.forum_replies;

CREATE POLICY "Anyone can view replies" ON public.forum_replies FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create replies" ON public.forum_replies FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can update own replies" ON public.forum_replies FOR UPDATE TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "Users can delete own replies" ON public.forum_replies FOR DELETE TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "Admins can manage all replies" ON public.forum_replies FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 3. Recreate secure views WITHOUT security_definer (uses invoker permissions)
-- =============================================
DROP VIEW IF EXISTS public.forum_threads_secure;
CREATE VIEW public.forum_threads_secure AS
SELECT
  id, title, content, category_id, created_at, updated_at, edited_at,
  is_pinned, is_locked, is_anonymous,
  CASE WHEN is_anonymous THEN NULL ELSE user_id END AS user_id,
  CASE WHEN is_anonymous THEN NULL ELSE author_id END AS author_id
FROM public.forum_threads;

DROP VIEW IF EXISTS public.forum_replies_secure;
CREATE VIEW public.forum_replies_secure AS
SELECT
  id, thread_id, content, created_at, updated_at, edited_at,
  is_solution, is_anonymous,
  CASE WHEN is_anonymous THEN NULL ELSE user_id END AS user_id,
  CASE WHEN is_anonymous THEN NULL ELSE author_id END AS author_id
FROM public.forum_replies;

-- =============================================
-- 4. Fix forum_votes: restrict SELECT to own votes only
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can view votes" ON public.forum_votes;
CREATE POLICY "Users can view own votes" ON public.forum_votes FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- =============================================
-- 5. Create RPC function for aggregated vote counts (no user_id exposure)
-- =============================================
CREATE OR REPLACE FUNCTION public.get_vote_counts(p_thread_ids uuid[])
RETURNS TABLE(item_id uuid, net_votes bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(fv.thread_id, fv.reply_id) AS item_id,
    SUM(CASE WHEN fv.vote_type = 'up' THEN 1 ELSE -1 END)::bigint AS net_votes
  FROM forum_votes fv
  WHERE fv.thread_id = ANY(p_thread_ids)
     OR fv.reply_id IN (SELECT id FROM forum_replies WHERE forum_replies.thread_id = ANY(p_thread_ids))
  GROUP BY COALESCE(fv.thread_id, fv.reply_id);
$$;

-- =============================================
-- 6. Drop unused UPDATE policies (score/answer manipulation prevention)
-- =============================================
DROP POLICY IF EXISTS "Users can update own answers" ON public.user_answers;
DROP POLICY IF EXISTS "Users can update own quiz attempts" ON public.quiz_attempts;
