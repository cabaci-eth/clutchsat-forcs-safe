
-- 1. question_media table for images/tables in questions
CREATE TABLE public.question_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  media_url TEXT NOT NULL,
  caption TEXT,
  display_order INTEGER DEFAULT 0,
  media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'table')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.question_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Question media is publicly readable"
ON public.question_media FOR SELECT USING (true);

CREATE POLICY "Admins can manage question media"
ON public.question_media FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Storage bucket for question images
INSERT INTO storage.buckets (id, name, public) VALUES ('question-images', 'question-images', true);

CREATE POLICY "Question images are publicly accessible"
ON storage.objects FOR SELECT USING (bucket_id = 'question-images');

CREATE POLICY "Admins can upload question images"
ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'question-images' AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete question images"
ON storage.objects FOR DELETE USING (
  bucket_id = 'question-images' AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- 3. Fix: Add missing UPDATE policy for user_answers
CREATE POLICY "Users can update own answers"
ON public.user_answers FOR UPDATE USING (auth.uid() = user_id);

-- 4. Fix: Add missing UPDATE policy for saved_questions  
CREATE POLICY "Users can update own saved questions"
ON public.saved_questions FOR UPDATE USING (auth.uid() = user_id);

-- 5. Fix: Add missing UPDATE policy for quiz_attempts
CREATE POLICY "Users can update own quiz attempts"
ON public.quiz_attempts FOR UPDATE USING (auth.uid() = user_id);

-- 6. Add admin ALL policies for tables that are missing them
CREATE POLICY "Admins can manage user answers"
ON public.user_answers FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage quiz attempts"
ON public.quiz_attempts FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage saved questions"
ON public.saved_questions FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage study plans"
ON public.study_plans FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage flashcard reviews"
ON public.user_flashcard_reviews FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage profiles"
ON public.profiles FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));
