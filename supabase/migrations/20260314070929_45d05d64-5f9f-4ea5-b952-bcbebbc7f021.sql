
-- Create user_question_summary table for efficient mistakes filtering
CREATE TABLE IF NOT EXISTS public.user_question_summary (
  user_id UUID NOT NULL,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  ever_correct BOOLEAN NOT NULL DEFAULT false,
  ever_incorrect BOOLEAN NOT NULL DEFAULT false,
  last_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);

ALTER TABLE public.user_question_summary ENABLE ROW LEVEL SECURITY;

-- RLS: users can only see their own rows
CREATE POLICY "Users can view own question summary"
ON public.user_question_summary FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own question summary"
ON public.user_question_summary FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own question summary"
ON public.user_question_summary FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage question summaries"
ON public.user_question_summary FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create index for fast lookups
CREATE INDEX idx_user_question_summary_user ON public.user_question_summary(user_id);
CREATE INDEX idx_user_question_summary_mistakes ON public.user_question_summary(user_id, ever_incorrect) WHERE ever_incorrect = true;

-- Trigger function to maintain summary on each answer insert
CREATE OR REPLACE FUNCTION public.update_question_summary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_question_summary (user_id, question_id, ever_correct, ever_incorrect, last_attempt_at)
  VALUES (
    NEW.user_id,
    NEW.question_id,
    NEW.is_correct,
    NOT NEW.is_correct,
    now()
  )
  ON CONFLICT (user_id, question_id) DO UPDATE SET
    ever_correct = user_question_summary.ever_correct OR NEW.is_correct,
    ever_incorrect = user_question_summary.ever_incorrect OR NOT NEW.is_correct,
    last_attempt_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger on user_answers
CREATE TRIGGER trg_update_question_summary
AFTER INSERT ON public.user_answers
FOR EACH ROW
EXECUTE FUNCTION public.update_question_summary();

-- Backfill existing data
INSERT INTO public.user_question_summary (user_id, question_id, ever_correct, ever_incorrect, last_attempt_at)
SELECT
  user_id,
  question_id,
  bool_or(is_correct),
  bool_or(NOT is_correct),
  max(created_at)
FROM public.user_answers
GROUP BY user_id, question_id
ON CONFLICT (user_id, question_id) DO UPDATE SET
  ever_correct = EXCLUDED.ever_correct,
  ever_incorrect = EXCLUDED.ever_incorrect,
  last_attempt_at = EXCLUDED.last_attempt_at;
