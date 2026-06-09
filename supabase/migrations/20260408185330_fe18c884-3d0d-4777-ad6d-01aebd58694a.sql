-- Remove direct user SELECT on subscriptions base table (force reads through subscriptions_safe view)
DROP POLICY IF EXISTS "Users can read own subscription" ON public.subscriptions;

-- Add a policy that only allows service_role to SELECT (already covered by existing service_role ALL policy)
-- No new policy needed - service_role ALL policy handles backend reads