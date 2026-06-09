
-- Fix: Restrict profiles SELECT to authenticated users only (hides premium_until from anon)
DROP POLICY "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by authenticated users"
  ON profiles FOR SELECT TO authenticated
  USING (true);
