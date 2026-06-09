import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SubscriptionData {
  subscribed: boolean;
  subscription_end: string | null;
}

export const useSubscription = () => {
  const { user } = useAuth();

  return useQuery<SubscriptionData>({
    queryKey: ["subscription", user?.id],
    enabled: !!user,
    refetchInterval: 60_000, // every minute
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      return data as SubscriptionData;
    },
  });
};

export const isPremiumUser = (premiumUntil: string | null | undefined): boolean => {
  if (!premiumUntil) return false;
  return new Date(premiumUntil) > new Date();
};
