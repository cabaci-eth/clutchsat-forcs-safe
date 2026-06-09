
-- Mock tests table
CREATE TABLE public.mock_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  is_premium boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mock_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mock tests are publicly readable"
  ON public.mock_tests FOR SELECT USING (true);

CREATE POLICY "Admins can manage mock tests"
  ON public.mock_tests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Mock test modules table
CREATE TABLE public.mock_test_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.mock_tests(id) ON DELETE CASCADE,
  module_name text NOT NULL,
  module_order integer NOT NULL DEFAULT 1,
  time_limit_minutes integer NOT NULL DEFAULT 32,
  question_count integer NOT NULL DEFAULT 27,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mock_test_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mock test modules are publicly readable"
  ON public.mock_test_modules FOR SELECT USING (true);

CREATE POLICY "Admins can manage mock test modules"
  ON public.mock_test_modules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Mock test questions table
CREATE TABLE public.mock_test_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.mock_tests(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.mock_test_modules(id) ON DELETE CASCADE,
  module_name text NOT NULL,
  module_order integer NOT NULL DEFAULT 1,
  question_order integer NOT NULL DEFAULT 1,
  question_text text NOT NULL,
  passage text,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_answer integer NOT NULL DEFAULT 0,
  question_type text NOT NULL DEFAULT 'multiple-choice',
  correct_answer_numeric numeric,
  explanation text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mock_test_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mock test questions are publicly readable"
  ON public.mock_test_questions FOR SELECT USING (true);

CREATE POLICY "Admins can manage mock test questions"
  ON public.mock_test_questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Mock test attempts table
CREATE TABLE public.mock_test_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id text,
  test_id uuid NOT NULL REFERENCES public.mock_tests(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'practice',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  total_score integer,
  section_scores jsonb DEFAULT '{}'::jsonb,
  answers jsonb DEFAULT '{}'::jsonb,
  time_spent jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mock_test_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attempts"
  ON public.mock_test_attempts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attempts"
  ON public.mock_test_attempts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own attempts"
  ON public.mock_test_attempts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Guest attempts by session"
  ON public.mock_test_attempts FOR INSERT TO anon
  WITH CHECK (user_id IS NULL AND session_id IS NOT NULL);

CREATE POLICY "Guests can read own session attempts"
  ON public.mock_test_attempts FOR SELECT TO anon
  USING (user_id IS NULL AND session_id IS NOT NULL);

CREATE POLICY "Admins can manage all attempts"
  ON public.mock_test_attempts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_mock_test_modules_test_id ON public.mock_test_modules(test_id);
CREATE INDEX idx_mock_test_questions_test_id ON public.mock_test_questions(test_id);
CREATE INDEX idx_mock_test_questions_module_id ON public.mock_test_questions(module_id);
CREATE INDEX idx_mock_test_attempts_user_id ON public.mock_test_attempts(user_id);
CREATE INDEX idx_mock_test_attempts_test_id ON public.mock_test_attempts(test_id);
CREATE INDEX idx_mock_test_attempts_session_id ON public.mock_test_attempts(session_id);
