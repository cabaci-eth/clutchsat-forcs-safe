
-- Fix 1: Prevent privilege escalation on user_roles
-- Add explicit deny policies for non-admin INSERT/UPDATE/DELETE
CREATE POLICY "Non-admins cannot insert roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Non-admins cannot update roles"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Non-admins cannot delete roles"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Fix 2: Explicitly deny authenticated user writes to subscriptions
CREATE POLICY "Block authenticated insert on subscriptions"
  ON public.subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Block authenticated update on subscriptions"
  ON public.subscriptions
  FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "Block authenticated delete on subscriptions"
  ON public.subscriptions
  FOR DELETE
  TO authenticated
  USING (false);
