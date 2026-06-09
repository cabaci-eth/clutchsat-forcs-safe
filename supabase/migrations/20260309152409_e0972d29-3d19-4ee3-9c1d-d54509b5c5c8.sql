
-- Fix 1: Replace public SELECT on forum_threads to redact author_id for anonymous posts
DROP POLICY IF EXISTS "Threads are publicly readable" ON public.forum_threads;
CREATE POLICY "Threads are publicly readable"
  ON public.forum_threads
  FOR SELECT
  USING (true);

-- We can't hide columns via RLS, so we need to remove author_id from the base table
-- and move it to a separate table. Instead, the simpler approach: replace the open
-- SELECT policy with one that only allows access through the secure view pattern.
-- Since RLS can't conditionally hide columns, we'll:
-- 1. Remove public SELECT from base tables
-- 2. Add SELECT only for post owners and admins on base tables
-- 3. Everyone else must use the secure views

DROP POLICY IF EXISTS "Threads are publicly readable" ON public.forum_threads;
DROP POLICY IF EXISTS "Replies are publicly readable" ON public.forum_replies;

-- Owners can read their own threads (needed for edit/delete checks)
CREATE POLICY "Users can view own threads"
  ON public.forum_threads
  FOR SELECT
  TO authenticated
  USING (auth.uid() = author_id);

-- Owners can read their own replies
CREATE POLICY "Users can view own replies"
  ON public.forum_replies
  FOR SELECT
  TO authenticated
  USING (auth.uid() = author_id);

-- Fix 2: Make question-images bucket private
UPDATE storage.buckets SET public = false WHERE id = 'question-images';

-- Remove redundant authenticated-only view policy (signed URLs handle access)
DROP POLICY IF EXISTS "Authenticated users can view question images" ON storage.objects;
