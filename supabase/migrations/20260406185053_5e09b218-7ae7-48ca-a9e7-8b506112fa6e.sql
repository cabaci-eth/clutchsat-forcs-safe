
CREATE TABLE public.ace_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message_date DATE NOT NULL DEFAULT CURRENT_DATE,
  message_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, message_date)
);

ALTER TABLE public.ace_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ace messages"
  ON public.ace_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ace messages"
  ON public.ace_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ace messages"
  ON public.ace_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_ace_messages_user_date ON public.ace_messages (user_id, message_date);
