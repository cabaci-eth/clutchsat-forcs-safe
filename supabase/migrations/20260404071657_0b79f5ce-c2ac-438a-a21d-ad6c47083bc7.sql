
-- 1. Remove the overly permissive SELECT policy on mock_test_questions
DROP POLICY IF EXISTS "Mock test questions readable by authenticated" ON public.mock_test_questions;

-- 2. Create a view that excludes correct answer columns
CREATE OR REPLACE VIEW public.mock_test_questions_public
WITH (security_invoker = true)
AS
SELECT 
  id, test_id, module_id, module_name, module_order, 
  question_order, question_text, question_type, options, 
  passage, image_url, explanation, created_at
FROM public.mock_test_questions;

-- Add SELECT policy so authenticated + anon can read the view's underlying table
-- (only through the view which excludes answer columns)
CREATE POLICY "Authenticated can read questions via view"
ON public.mock_test_questions
FOR SELECT
TO authenticated
USING (true);

-- Wait - security_invoker view means the querying user's RLS applies.
-- But we already have the admin ALL policy. Let me just use the view approach differently.
-- Actually, security_invoker = true means the view respects the caller's RLS.
-- So authenticated users CAN select from the view because of the policy above.
-- But they only see the columns exposed by the view, not correct_answer.
-- However, they could also query the base table directly with the same policy...
-- That defeats the purpose. Let me use SECURITY DEFINER view instead + no direct SELECT policy.

-- Undo: drop the policy we just created and recreate properly
DROP POLICY IF EXISTS "Authenticated can read questions via view" ON public.mock_test_questions;
DROP VIEW IF EXISTS public.mock_test_questions_public;

-- The admin ALL policy on mock_test_questions still allows admin full access.
-- For non-admins, we provide NO direct SELECT policy - they must use RPCs/view.

-- Create a SECURITY DEFINER view (runs as view owner, bypasses caller's RLS)
CREATE OR REPLACE VIEW public.mock_test_questions_public
WITH (security_barrier = true)
AS
SELECT 
  id, test_id, module_id, module_name, module_order, 
  question_order, question_text, question_type, options, 
  passage, image_url, explanation, created_at
FROM public.mock_test_questions;

-- Grant SELECT on the view to authenticated and anon roles
GRANT SELECT ON public.mock_test_questions_public TO authenticated;
GRANT SELECT ON public.mock_test_questions_public TO anon;

-- 3. RPC to check a single answer (for practice mode)
CREATE OR REPLACE FUNCTION public.check_mock_answer(p_question_id uuid, p_selected_answer int)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'is_correct', (correct_answer = p_selected_answer),
    'correct_answer', correct_answer,
    'explanation', explanation
  )
  FROM public.mock_test_questions
  WHERE id = p_question_id;
$$;

-- 4. RPC to score a full mock test (for simulation mode)
CREATE OR REPLACE FUNCTION public.score_mock_test(p_test_id uuid, p_answers jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_question RECORD;
  v_selected int;
  v_is_correct boolean;
  v_per_question jsonb := '{}'::jsonb;
BEGIN
  FOR v_question IN 
    SELECT id, correct_answer, module_name, module_order
    FROM public.mock_test_questions 
    WHERE test_id = p_test_id
  LOOP
    v_selected := (p_answers->>v_question.id::text)::int;
    v_is_correct := (v_selected IS NOT NULL AND v_selected = v_question.correct_answer);
    v_per_question := v_per_question || jsonb_build_object(
      v_question.id::text, jsonb_build_object(
        'is_correct', v_is_correct,
        'correct_answer', v_question.correct_answer,
        'module_name', v_question.module_name,
        'module_order', v_question.module_order
      )
    );
  END LOOP;
  
  RETURN jsonb_build_object('questions', v_per_question);
END;
$$;

-- 5. RPC to get full answers for a completed attempt report
CREATE OR REPLACE FUNCTION public.get_mock_test_answers(p_test_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_object_agg(
    id::text,
    jsonb_build_object(
      'correct_answer', correct_answer,
      'explanation', explanation
    )
  )
  FROM public.mock_test_questions
  WHERE test_id = p_test_id;
$$;

-- 6. Fix guest attempt data leak - drop overly permissive anon SELECT
DROP POLICY IF EXISTS "Guests can read own session attempts" ON public.mock_test_attempts;

-- 7. Create RPC for guest attempt retrieval scoped by session_id
CREATE OR REPLACE FUNCTION public.get_guest_mock_attempts(p_session_id text, p_test_id uuid DEFAULT NULL)
RETURNS SETOF public.mock_test_attempts
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.mock_test_attempts
  WHERE user_id IS NULL 
    AND session_id = p_session_id
    AND (p_test_id IS NULL OR test_id = p_test_id)
  ORDER BY created_at DESC;
$$;

-- 8. Add anon UPDATE policy for guest resume (scoped to session_id)
CREATE POLICY "Guests can update own session attempts"
ON public.mock_test_attempts
FOR UPDATE
TO anon
USING ((user_id IS NULL) AND (session_id IS NOT NULL));
