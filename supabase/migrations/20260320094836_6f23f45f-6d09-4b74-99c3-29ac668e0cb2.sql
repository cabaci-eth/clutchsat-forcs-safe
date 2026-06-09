
CREATE TABLE IF NOT EXISTS public.daily_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  answer_correct BOOLEAN NOT NULL,
  answered_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, question_id, answered_at)
);

ALTER TABLE public.daily_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily answers" ON public.daily_answers
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily answers" ON public.daily_answers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage daily answers" ON public.daily_answers
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
