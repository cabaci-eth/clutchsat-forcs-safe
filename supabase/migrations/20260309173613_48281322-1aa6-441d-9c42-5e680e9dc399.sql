-- Fix 1: Restrict forum_votes SELECT to authenticated users only
DROP POLICY IF EXISTS "Votes are publicly readable" ON public.forum_votes;
CREATE POLICY "Authenticated users can view votes"
  ON public.forum_votes FOR SELECT TO authenticated
  USING (true);

-- Fix 2: Drop orphaned public storage READ policy
DROP POLICY IF EXISTS "Public read access for question images" ON storage.objects;