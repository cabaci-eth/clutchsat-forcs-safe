
-- =============================================
-- 1. Convert ALL RESTRICTIVE policies to PERMISSIVE
-- =============================================

-- community_questions
DROP POLICY IF EXISTS "Admins can manage community questions" ON public.community_questions;
DROP POLICY IF EXISTS "Users can submit community questions" ON public.community_questions;
DROP POLICY IF EXISTS "Users can view own submissions" ON public.community_questions;
CREATE POLICY "Admins can manage community questions" ON public.community_questions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can submit community questions" ON public.community_questions FOR INSERT TO authenticated WITH CHECK (auth.uid() = submitted_by);
CREATE POLICY "Users can view own submissions" ON public.community_questions FOR SELECT TO authenticated USING (auth.uid() = submitted_by);

-- flashcards
DROP POLICY IF EXISTS "Admins can manage flashcards" ON public.flashcards;
DROP POLICY IF EXISTS "Flashcards are viewable by everyone" ON public.flashcards;
CREATE POLICY "Admins can manage flashcards" ON public.flashcards FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Flashcards are viewable by everyone" ON public.flashcards FOR SELECT USING (true);

-- forum_categories
DROP POLICY IF EXISTS "Admins can manage forum categories" ON public.forum_categories;
DROP POLICY IF EXISTS "Forum categories are public" ON public.forum_categories;
CREATE POLICY "Admins can manage forum categories" ON public.forum_categories FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Forum categories are public" ON public.forum_categories FOR SELECT USING (true);

-- forum_threads (keep SELECT restricted to owners to protect anonymous poster IDs)
DROP POLICY IF EXISTS "Admins can manage all threads" ON public.forum_threads;
DROP POLICY IF EXISTS "Authenticated users can create threads" ON public.forum_threads;
DROP POLICY IF EXISTS "Owner can select own threads" ON public.forum_threads;
DROP POLICY IF EXISTS "Users can delete own threads" ON public.forum_threads;
DROP POLICY IF EXISTS "Users can update own threads" ON public.forum_threads;
CREATE POLICY "Admins can manage all threads" ON public.forum_threads FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can create threads" ON public.forum_threads FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Owner can select own threads" ON public.forum_threads FOR SELECT TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "Users can delete own threads" ON public.forum_threads FOR DELETE TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "Users can update own threads" ON public.forum_threads FOR UPDATE TO authenticated USING (auth.uid() = author_id);

-- forum_replies (same pattern)
DROP POLICY IF EXISTS "Admins can manage all replies" ON public.forum_replies;
DROP POLICY IF EXISTS "Authenticated users can create replies" ON public.forum_replies;
DROP POLICY IF EXISTS "Owner can select own replies" ON public.forum_replies;
DROP POLICY IF EXISTS "Users can delete own replies" ON public.forum_replies;
DROP POLICY IF EXISTS "Users can update own replies" ON public.forum_replies;
CREATE POLICY "Admins can manage all replies" ON public.forum_replies FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can create replies" ON public.forum_replies FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Owner can select own replies" ON public.forum_replies FOR SELECT TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "Users can delete own replies" ON public.forum_replies FOR DELETE TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "Users can update own replies" ON public.forum_replies FOR UPDATE TO authenticated USING (auth.uid() = author_id);

-- forum_votes
DROP POLICY IF EXISTS "Users can delete own votes" ON public.forum_votes;
DROP POLICY IF EXISTS "Users can manage own votes" ON public.forum_votes;
DROP POLICY IF EXISTS "Users can update own votes" ON public.forum_votes;
DROP POLICY IF EXISTS "Users can view own votes" ON public.forum_votes;
CREATE POLICY "Users can view own votes" ON public.forum_votes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own votes" ON public.forum_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own votes" ON public.forum_votes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own votes" ON public.forum_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- profiles
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Admins can manage profiles" ON public.profiles FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- question_media
DROP POLICY IF EXISTS "Admins can manage question media" ON public.question_media;
DROP POLICY IF EXISTS "Question media is publicly readable" ON public.question_media;
CREATE POLICY "Admins can manage question media" ON public.question_media FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Question media is publicly readable" ON public.question_media FOR SELECT USING (true);

-- questions
DROP POLICY IF EXISTS "Admins can manage questions" ON public.questions;
DROP POLICY IF EXISTS "Questions are viewable by everyone" ON public.questions;
CREATE POLICY "Admins can manage questions" ON public.questions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Questions are viewable by everyone" ON public.questions FOR SELECT USING (true);

-- quiz_attempts
DROP POLICY IF EXISTS "Admins can manage quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Users can delete own quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Users can insert own quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Users can view own quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Admins can manage quiz attempts" ON public.quiz_attempts FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own quiz attempts" ON public.quiz_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own quiz attempts" ON public.quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own quiz attempts" ON public.quiz_attempts FOR DELETE USING (auth.uid() = user_id);

-- saved_flashcards
DROP POLICY IF EXISTS "Admins can manage saved flashcards" ON public.saved_flashcards;
DROP POLICY IF EXISTS "Users can delete own saved flashcards" ON public.saved_flashcards;
DROP POLICY IF EXISTS "Users can insert own saved flashcards" ON public.saved_flashcards;
DROP POLICY IF EXISTS "Users can view own saved flashcards" ON public.saved_flashcards;
CREATE POLICY "Admins can manage saved flashcards" ON public.saved_flashcards FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own saved flashcards" ON public.saved_flashcards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own saved flashcards" ON public.saved_flashcards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own saved flashcards" ON public.saved_flashcards FOR DELETE USING (auth.uid() = user_id);

-- saved_questions
DROP POLICY IF EXISTS "Admins can manage saved questions" ON public.saved_questions;
DROP POLICY IF EXISTS "Users can delete own saved questions" ON public.saved_questions;
DROP POLICY IF EXISTS "Users can insert own saved questions" ON public.saved_questions;
DROP POLICY IF EXISTS "Users can update own saved questions" ON public.saved_questions;
DROP POLICY IF EXISTS "Users can view own saved questions" ON public.saved_questions;
CREATE POLICY "Admins can manage saved questions" ON public.saved_questions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own saved questions" ON public.saved_questions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own saved questions" ON public.saved_questions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own saved questions" ON public.saved_questions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own saved questions" ON public.saved_questions FOR DELETE USING (auth.uid() = user_id);

-- study_plans
DROP POLICY IF EXISTS "Admins can manage study plans" ON public.study_plans;
DROP POLICY IF EXISTS "Users can delete own plans" ON public.study_plans;
DROP POLICY IF EXISTS "Users can insert own plans" ON public.study_plans;
DROP POLICY IF EXISTS "Users can update own plans" ON public.study_plans;
DROP POLICY IF EXISTS "Users can view own plans" ON public.study_plans;
CREATE POLICY "Admins can manage study plans" ON public.study_plans FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own plans" ON public.study_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own plans" ON public.study_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own plans" ON public.study_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own plans" ON public.study_plans FOR DELETE USING (auth.uid() = user_id);

-- user_answers
DROP POLICY IF EXISTS "Admins can manage user answers" ON public.user_answers;
DROP POLICY IF EXISTS "Users can delete own answers" ON public.user_answers;
DROP POLICY IF EXISTS "Users can insert own answers" ON public.user_answers;
DROP POLICY IF EXISTS "Users can view own answers" ON public.user_answers;
CREATE POLICY "Admins can manage user answers" ON public.user_answers FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own answers" ON public.user_answers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own answers" ON public.user_answers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own answers" ON public.user_answers FOR DELETE USING (auth.uid() = user_id);

-- user_flashcard_reviews
DROP POLICY IF EXISTS "Admins can manage flashcard reviews" ON public.user_flashcard_reviews;
DROP POLICY IF EXISTS "Users can delete own flashcard reviews" ON public.user_flashcard_reviews;
DROP POLICY IF EXISTS "Users can insert own reviews" ON public.user_flashcard_reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON public.user_flashcard_reviews;
DROP POLICY IF EXISTS "Users can view own reviews" ON public.user_flashcard_reviews;
CREATE POLICY "Admins can manage flashcard reviews" ON public.user_flashcard_reviews FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own reviews" ON public.user_flashcard_reviews FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reviews" ON public.user_flashcard_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON public.user_flashcard_reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reviews" ON public.user_flashcard_reviews FOR DELETE USING (auth.uid() = user_id);

-- user_roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- =============================================
-- 2. Server-side is_correct computation trigger
-- =============================================
CREATE OR REPLACE FUNCTION public.compute_is_correct()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  SELECT (NEW.selected_answer = q.correct_answer)
  INTO NEW.is_correct
  FROM public.questions q
  WHERE q.id = NEW.question_id;
  
  -- If question not found, default to false
  IF NEW.is_correct IS NULL THEN
    NEW.is_correct := false;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compute_is_correct ON public.user_answers;
CREATE TRIGGER trg_compute_is_correct
  BEFORE INSERT ON public.user_answers
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_is_correct();

-- =============================================
-- 3. Recreate forum secure views with proper redaction
-- =============================================
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

GRANT SELECT ON public.forum_threads_secure TO anon, authenticated;
GRANT SELECT ON public.forum_replies_secure TO anon, authenticated;
