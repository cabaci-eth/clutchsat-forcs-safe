import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, subMonths, startOfDay } from "date-fns";

export type TimeRange = "all" | "6months" | "month" | "week";

function getDateFilter(range: TimeRange): Date | null {
  const now = new Date();
  switch (range) {
    case "week": return startOfDay(subDays(now, 7));
    case "month": return startOfDay(subMonths(now, 1));
    case "6months": return startOfDay(subMonths(now, 6));
    default: return null;
  }
}

export function useProgressData(userId: string | undefined, timeRange: TimeRange) {
  const dateFilter = getDateFilter(timeRange);
  const dateStr = dateFilter?.toISOString() ?? null;

  const userAnswers = useQuery({
    queryKey: ["progress_answers", userId, timeRange],
    enabled: !!userId,
    queryFn: async () => {
      let q = supabase.from("user_answers")
        .select("*, questions(subject, subsection, sub_subsection, difficulty)")
        .eq("user_id", userId!);
      if (dateStr) q = q.gte("created_at", dateStr);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const quizAttempts = useQuery({
    queryKey: ["progress_quizzes", userId, timeRange],
    enabled: !!userId,
    queryFn: async () => {
      let q = supabase.from("quiz_attempts")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (dateStr) q = q.gte("created_at", dateStr);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const streak = useQuery({
    queryKey: ["progress_streak", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_streaks")
        .select("*").eq("user_id", userId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const xp = useQuery({
    queryKey: ["progress_xp", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_xp")
        .select("*").eq("user_id", userId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const savedCount = useQuery({
    queryKey: ["saved_count", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { count, error } = await supabase.from("saved_questions")
        .select("*", { count: "exact", head: true }).eq("user_id", userId!);
      if (error) throw error;
      return count || 0;
    },
  });

  return {
    userAnswers: userAnswers.data ?? [],
    quizAttempts: quizAttempts.data ?? [],
    streak: streak.data,
    xp: xp.data,
    savedCount: savedCount.data ?? 0,
    isLoading: userAnswers.isLoading || quizAttempts.isLoading,
  };
}
