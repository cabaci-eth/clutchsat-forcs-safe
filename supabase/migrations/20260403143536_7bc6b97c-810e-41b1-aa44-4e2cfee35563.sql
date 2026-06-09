
-- Remove the public SELECT policy on mock_test_questions
DROP POLICY IF EXISTS "Mock test questions are publicly readable" ON public.mock_test_questions;

-- Replace with authenticated-only SELECT
CREATE POLICY "Mock test questions readable by authenticated"
  ON public.mock_test_questions
  FOR SELECT
  TO authenticated
  USING (true);
