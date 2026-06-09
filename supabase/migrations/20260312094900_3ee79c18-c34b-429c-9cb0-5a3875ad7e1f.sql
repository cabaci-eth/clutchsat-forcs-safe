
-- Create user_streaks table
CREATE TABLE IF NOT EXISTS public.user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streaks" ON public.user_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own streaks" ON public.user_streaks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own streaks" ON public.user_streaks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage streaks" ON public.user_streaks FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create user_xp table
CREATE TABLE IF NOT EXISTS public.user_xp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own xp" ON public.user_xp FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own xp" ON public.user_xp FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own xp" ON public.user_xp FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage xp" ON public.user_xp FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create achievements catalog table
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  criteria_type TEXT NOT NULL,
  criteria_value INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Achievements are public" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "Admins can manage achievements" ON public.achievements FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create user_achievements table
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can earn achievements" ON public.user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage user achievements" ON public.user_achievements FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Function to handle gamification on question answer
CREATE OR REPLACE FUNCTION public.handle_gamification_on_answer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_xp_gain INTEGER;
  v_today DATE := CURRENT_DATE;
  v_streak RECORD;
  v_total_xp INTEGER;
  v_new_level INTEGER;
BEGIN
  -- XP: 10 for correct, 5 for attempt
  v_xp_gain := CASE WHEN NEW.is_correct THEN 10 ELSE 5 END;

  -- Upsert user_xp
  INSERT INTO public.user_xp (user_id, total_xp, level, updated_at)
  VALUES (NEW.user_id, v_xp_gain, 1, now())
  ON CONFLICT (user_id) DO UPDATE SET
    total_xp = user_xp.total_xp + v_xp_gain,
    updated_at = now();

  -- Recalculate level (every 500 XP = 1 level)
  SELECT total_xp INTO v_total_xp FROM public.user_xp WHERE user_id = NEW.user_id;
  v_new_level := GREATEST(1, (v_total_xp / 500) + 1);
  UPDATE public.user_xp SET level = v_new_level WHERE user_id = NEW.user_id;

  -- Upsert streak
  SELECT * INTO v_streak FROM public.user_streaks WHERE user_id = NEW.user_id;
  IF NOT FOUND THEN
    INSERT INTO public.user_streaks (user_id, current_streak, longest_streak, last_activity_date, updated_at)
    VALUES (NEW.user_id, 1, 1, v_today, now());
  ELSE
    IF v_streak.last_activity_date = v_today THEN
      -- Already active today, do nothing
      NULL;
    ELSIF v_streak.last_activity_date = v_today - 1 THEN
      -- Consecutive day
      UPDATE public.user_streaks SET
        current_streak = v_streak.current_streak + 1,
        longest_streak = GREATEST(v_streak.longest_streak, v_streak.current_streak + 1),
        last_activity_date = v_today,
        updated_at = now()
      WHERE user_id = NEW.user_id;
    ELSE
      -- Streak broken
      UPDATE public.user_streaks SET
        current_streak = 1,
        last_activity_date = v_today,
        updated_at = now()
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on user_answers
CREATE TRIGGER trg_gamification_on_answer
  AFTER INSERT ON public.user_answers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_gamification_on_answer();

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION public.check_achievements(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_achievement RECORD;
  v_count INTEGER;
  v_streak INTEGER;
BEGIN
  FOR v_achievement IN
    SELECT a.* FROM public.achievements a
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_achievements ua
      WHERE ua.user_id = p_user_id AND ua.achievement_id = a.id
    )
  LOOP
    CASE v_achievement.criteria_type
      WHEN 'questions_answered' THEN
        SELECT COUNT(*) INTO v_count FROM public.user_answers WHERE user_id = p_user_id;
        IF v_count >= v_achievement.criteria_value THEN
          INSERT INTO public.user_achievements (user_id, achievement_id) VALUES (p_user_id, v_achievement.id) ON CONFLICT DO NOTHING;
          UPDATE public.user_xp SET total_xp = total_xp + v_achievement.xp_reward WHERE user_id = p_user_id;
        END IF;
      WHEN 'streak_days' THEN
        SELECT current_streak INTO v_streak FROM public.user_streaks WHERE user_id = p_user_id;
        IF v_streak >= v_achievement.criteria_value THEN
          INSERT INTO public.user_achievements (user_id, achievement_id) VALUES (p_user_id, v_achievement.id) ON CONFLICT DO NOTHING;
          UPDATE public.user_xp SET total_xp = total_xp + v_achievement.xp_reward WHERE user_id = p_user_id;
        END IF;
      WHEN 'flashcards_reviewed' THEN
        SELECT COUNT(*) INTO v_count FROM public.user_flashcard_reviews WHERE user_id = p_user_id;
        IF v_count >= v_achievement.criteria_value THEN
          INSERT INTO public.user_achievements (user_id, achievement_id) VALUES (p_user_id, v_achievement.id) ON CONFLICT DO NOTHING;
          UPDATE public.user_xp SET total_xp = total_xp + v_achievement.xp_reward WHERE user_id = p_user_id;
        END IF;
      WHEN 'community_submission' THEN
        SELECT COUNT(*) INTO v_count FROM public.community_questions WHERE submitted_by = p_user_id;
        IF v_count >= v_achievement.criteria_value THEN
          INSERT INTO public.user_achievements (user_id, achievement_id) VALUES (p_user_id, v_achievement.id) ON CONFLICT DO NOTHING;
          UPDATE public.user_xp SET total_xp = total_xp + v_achievement.xp_reward WHERE user_id = p_user_id;
        END IF;
      WHEN 'perfect_quiz' THEN
        SELECT COUNT(*) INTO v_count FROM public.quiz_attempts WHERE user_id = p_user_id AND score = total_questions;
        IF v_count >= v_achievement.criteria_value THEN
          INSERT INTO public.user_achievements (user_id, achievement_id) VALUES (p_user_id, v_achievement.id) ON CONFLICT DO NOTHING;
          UPDATE public.user_xp SET total_xp = total_xp + v_achievement.xp_reward WHERE user_id = p_user_id;
        END IF;
      ELSE
        NULL;
    END CASE;
  END LOOP;
END;
$$;
