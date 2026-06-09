-- Create a trigger function that prevents non-admin users from changing premium_until
CREATE OR REPLACE FUNCTION public.protect_premium_until()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If premium_until is being changed and the caller is not service_role
  IF OLD.premium_until IS DISTINCT FROM NEW.premium_until THEN
    -- Check if the current user is an admin
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      -- Revert the premium_until change silently
      NEW.premium_until := OLD.premium_until;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach trigger to profiles table
CREATE TRIGGER protect_premium_until_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_premium_until();