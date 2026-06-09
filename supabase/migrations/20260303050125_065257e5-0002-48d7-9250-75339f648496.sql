
-- Add foreign key references for forum tables to profiles
ALTER TABLE public.forum_threads
  ADD CONSTRAINT forum_threads_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.forum_replies
  ADD CONSTRAINT forum_replies_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
