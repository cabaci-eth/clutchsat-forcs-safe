
-- ============================================
-- FIX 1: Guest mock test attempts - secure session ownership
-- ============================================

-- Remove the insecure anon policies
DROP POLICY IF EXISTS "Guest attempts by session" ON mock_test_attempts;
DROP POLICY IF EXISTS "Guests can update own session attempts" ON mock_test_attempts;

-- Create RPC for inserting guest attempts (validates session_id)
CREATE OR REPLACE FUNCTION public.insert_guest_mock_attempt(
  p_session_id text,
  p_test_id uuid,
  p_mode text DEFAULT 'practice'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_session_id IS NULL OR length(trim(p_session_id)) < 10 THEN
    RAISE EXCEPTION 'Invalid session_id';
  END IF;

  INSERT INTO public.mock_test_attempts (session_id, test_id, mode, user_id)
  VALUES (p_session_id, p_test_id, p_mode, NULL)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Create RPC for updating guest attempts (validates session_id ownership)
CREATE OR REPLACE FUNCTION public.update_guest_mock_attempt(
  p_session_id text,
  p_attempt_id uuid,
  p_answers jsonb DEFAULT NULL,
  p_time_spent jsonb DEFAULT NULL,
  p_completed_at timestamptz DEFAULT NULL,
  p_total_score int DEFAULT NULL,
  p_section_scores jsonb DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated int;
BEGIN
  IF p_session_id IS NULL OR length(trim(p_session_id)) < 10 THEN
    RAISE EXCEPTION 'Invalid session_id';
  END IF;

  UPDATE public.mock_test_attempts
  SET
    answers = COALESCE(p_answers, answers),
    time_spent = COALESCE(p_time_spent, time_spent),
    completed_at = COALESCE(p_completed_at, completed_at),
    total_score = COALESCE(p_total_score, total_score),
    section_scores = COALESCE(p_section_scores, section_scores)
  WHERE id = p_attempt_id
    AND session_id = p_session_id
    AND user_id IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

-- ============================================
-- FIX 2: Profiles - restrict premium_until exposure
-- ============================================

-- Drop the overly broad SELECT policy
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;

-- Users can only read their own profile (full data)
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Create a public view for cross-user lookups (forum, etc.)
CREATE OR REPLACE VIEW public.profiles_public AS
  SELECT user_id, username, avatar_url, bio
  FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;
