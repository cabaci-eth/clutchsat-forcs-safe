
-- 1. Fix missing DELETE policy on user_flashcard_reviews
CREATE POLICY "Users can delete own flashcard reviews"
ON public.user_flashcard_reviews
FOR DELETE
USING (auth.uid() = user_id);

-- 2. Add difficulty column to flashcards
ALTER TABLE public.flashcards ADD COLUMN IF NOT EXISTS difficulty text DEFAULT 'Medium';

-- 3. Add question_type and correct_answer_numeric to questions for grid-in
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS question_type text DEFAULT 'multiple-choice';
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS correct_answer_numeric decimal;

-- 4. Add theme_preference to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS theme_preference text DEFAULT 'light';

-- 5. Create saved_questions table
CREATE TABLE public.saved_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  saved_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  UNIQUE(user_id, question_id)
);
ALTER TABLE public.saved_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved questions"
ON public.saved_questions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved questions"
ON public.saved_questions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved questions"
ON public.saved_questions FOR DELETE
USING (auth.uid() = user_id);

-- 6. Create forum tables
CREATE TABLE public.forum_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  slug text UNIQUE NOT NULL
);
ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Forum categories are public" ON public.forum_categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage forum categories" ON public.forum_categories FOR ALL USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.forum_categories (name, description, slug) VALUES
  ('General', 'General SAT discussion', 'general'),
  ('Math Help', 'Get help with math questions', 'math-help'),
  ('Reading & Writing', 'Discuss reading and writing strategies', 'reading-writing'),
  ('Study Tips', 'Share study strategies and tips', 'study-tips'),
  ('Score Reports', 'Share your progress and scores', 'score-reports');

CREATE TABLE public.forum_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  user_id uuid NOT NULL,
  category_id uuid REFERENCES public.forum_categories(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  is_pinned boolean DEFAULT false,
  is_locked boolean DEFAULT false
);
ALTER TABLE public.forum_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Threads are publicly readable" ON public.forum_threads FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create threads" ON public.forum_threads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own threads" ON public.forum_threads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own threads" ON public.forum_threads FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all threads" ON public.forum_threads FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.forum_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  content text NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  is_solution boolean DEFAULT false
);
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Replies are publicly readable" ON public.forum_replies FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create replies" ON public.forum_replies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own replies" ON public.forum_replies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own replies" ON public.forum_replies FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all replies" ON public.forum_replies FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.forum_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  thread_id uuid REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  reply_id uuid REFERENCES public.forum_replies(id) ON DELETE CASCADE,
  vote_type text NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, thread_id),
  UNIQUE(user_id, reply_id)
);
ALTER TABLE public.forum_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Votes are publicly readable" ON public.forum_votes FOR SELECT USING (true);
CREATE POLICY "Users can manage own votes" ON public.forum_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own votes" ON public.forum_votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own votes" ON public.forum_votes FOR DELETE USING (auth.uid() = user_id);

-- 7. Update existing flashcards with random difficulty
UPDATE public.flashcards SET difficulty = 
  CASE (random() * 3)::int
    WHEN 0 THEN 'Easy'
    WHEN 1 THEN 'Medium'
    ELSE 'Hard'
  END;

-- 8. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_questions_subject ON public.questions(subject);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON public.questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_subsection ON public.questions(subsection);
CREATE INDEX IF NOT EXISTS idx_user_answers_user_id ON public.user_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_questions_user_id ON public.saved_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_category ON public.forum_threads(category_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_thread ON public.forum_replies(thread_id);
