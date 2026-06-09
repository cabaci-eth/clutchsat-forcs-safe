
-- Add difficulty and subsection columns to questions
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS difficulty text DEFAULT 'Medium';
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS subsection text;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS passage text;

-- Create community_questions table
CREATE TABLE public.community_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  subsection text,
  difficulty text NOT NULL DEFAULT 'Medium',
  question_text text NOT NULL,
  options jsonb NOT NULL,
  correct_answer integer NOT NULL,
  explanation text NOT NULL,
  passage text,
  submitted_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.community_questions ENABLE ROW LEVEL SECURITY;

-- RLS: users can insert their own submissions
CREATE POLICY "Users can submit community questions"
ON public.community_questions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = submitted_by);

-- RLS: users can view their own submissions
CREATE POLICY "Users can view own submissions"
ON public.community_questions FOR SELECT TO authenticated
USING (auth.uid() = submitted_by);

-- RLS: admins can do everything
CREATE POLICY "Admins can manage community questions"
ON public.community_questions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_questions_subject ON public.questions(subject);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON public.questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_subsection ON public.questions(subsection);
CREATE INDEX IF NOT EXISTS idx_community_questions_status ON public.community_questions(status);
