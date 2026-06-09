
-- 1. Fix user_roles admin policy: change from {public} to {authenticated}
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Create safe subscriptions view without Stripe IDs
CREATE OR REPLACE VIEW public.subscriptions_safe AS
  SELECT id, user_id, status, current_period_end, created_at, updated_at
  FROM public.subscriptions;

-- 3. Fix other admin ALL policies from {public} to {authenticated}
DROP POLICY IF EXISTS "Admins can manage achievements" ON public.achievements;
CREATE POLICY "Admins can manage achievements"
  ON public.achievements FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage flashcards" ON public.flashcards;
CREATE POLICY "Admins can manage flashcards"
  ON public.flashcards FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage forum categories" ON public.forum_categories;
CREATE POLICY "Admins can manage forum categories"
  ON public.forum_categories FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;
CREATE POLICY "Admins can manage profiles"
  ON public.profiles FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage question media" ON public.question_media;
CREATE POLICY "Admins can manage question media"
  ON public.question_media FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage questions" ON public.questions;
CREATE POLICY "Admins can manage questions"
  ON public.questions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Admins can manage quiz attempts"
  ON public.quiz_attempts FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage saved flashcards" ON public.saved_flashcards;
CREATE POLICY "Admins can manage saved flashcards"
  ON public.saved_flashcards FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage saved questions" ON public.saved_questions;
CREATE POLICY "Admins can manage saved questions"
  ON public.saved_questions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage study plans" ON public.study_plans;
CREATE POLICY "Admins can manage study plans"
  ON public.study_plans FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage user achievements" ON public.user_achievements;
CREATE POLICY "Admins can manage user achievements"
  ON public.user_achievements FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage streaks" ON public.user_streaks;
CREATE POLICY "Admins can manage streaks"
  ON public.user_streaks FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage xp" ON public.user_xp;
CREATE POLICY "Admins can manage xp"
  ON public.user_xp FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
