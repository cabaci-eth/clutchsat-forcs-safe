
-- Remove user INSERT/UPDATE policies from gamification tables
-- All writes come from SECURITY DEFINER triggers/functions

-- user_xp: remove user insert and update policies
DROP POLICY IF EXISTS "Users can insert own xp" ON public.user_xp;
DROP POLICY IF EXISTS "Users can update own xp" ON public.user_xp;

-- user_streaks: remove user insert and update policies
DROP POLICY IF EXISTS "Users can insert own streaks" ON public.user_streaks;
DROP POLICY IF EXISTS "Users can update own streaks" ON public.user_streaks;

-- user_achievements: remove user insert policy (writes come from check_achievements)
DROP POLICY IF EXISTS "Users can earn achievements" ON public.user_achievements;

-- Revoke direct write permissions from authenticated users
REVOKE INSERT, UPDATE ON public.user_xp FROM authenticated;
REVOKE INSERT, UPDATE ON public.user_streaks FROM authenticated;
REVOKE INSERT ON public.user_achievements FROM authenticated;
