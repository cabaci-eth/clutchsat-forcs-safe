import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface DashboardData {
  streak: { current: number; longest: number; lastDate: string | null };
  xp: { total: number; level: number; nextLevelXp: number };
  achievements: { earned: any[]; nextUp: any | null; nextProgress: number };
  weakArea: { subsection: string; subject: string; accuracy: number } | null;
  recentQuiz: { score: number; total: number; subject: string | null; date: string } | null;
  recentFlashcards: number;
  upcomingTasks: { day: number; date: string; topics: string[] }[];
}

export const useDashboardData = () => {
  const { user } = useAuth();

  return useQuery<DashboardData>({
    queryKey: ["dashboard", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const uid = user!.id;

      // Parallel fetches
      const [streakRes, xpRes, achievementsRes, earnedRes, answersRes, quizRes, flashcardRes, planRes] =
        await Promise.all([
          supabase.from("user_streaks").select("*").eq("user_id", uid).maybeSingle(),
          supabase.from("user_xp").select("*").eq("user_id", uid).maybeSingle(),
          supabase.from("achievements").select("*"),
          supabase.from("user_achievements").select("*, achievements(*)").eq("user_id", uid),
          supabase
            .from("user_answers")
            .select("is_correct, questions!inner(subject, subsection)")
            .eq("user_id", uid),
          supabase
            .from("quiz_attempts")
            .select("*")
            .eq("user_id", uid)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("user_flashcard_reviews")
            .select("id")
            .eq("user_id", uid),
          supabase
            .from("study_plans")
            .select("plan_json, completions, test_date")
            .eq("user_id", uid)
            .gte("test_date", new Date().toISOString().split("T")[0])
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

      // Streak
      const streak = {
        current: streakRes.data?.current_streak ?? 0,
        longest: streakRes.data?.longest_streak ?? 0,
        lastDate: streakRes.data?.last_activity_date ?? null,
      };

      // XP
      const totalXp = xpRes.data?.total_xp ?? 0;
      const level = xpRes.data?.level ?? 1;
      const nextLevelXp = level * 500;
      const xp = { total: totalXp, level, nextLevelXp };

      // Achievements
      const allAchievements = achievementsRes.data ?? [];
      const earnedIds = new Set((earnedRes.data ?? []).map((e: any) => e.achievement_id));
      const earned = (earnedRes.data ?? []).map((e: any) => ({
        ...(e.achievements || {}),
        earned_at: e.earned_at,
        achievement_id: e.achievement_id,
      }));
      const totalAnswers = (answersRes.data ?? []).length;
      const totalFlashcards = (flashcardRes.data ?? []).length;

      // Find next achievement with progress
      let nextUp: any = null;
      let nextProgress = 0;
      for (const a of allAchievements) {
        if (earnedIds.has(a.id)) continue;
        let progress = 0;
        if (a.criteria_type === "questions_answered") progress = totalAnswers / a.criteria_value;
        else if (a.criteria_type === "streak_days") progress = streak.current / a.criteria_value;
        else if (a.criteria_type === "flashcards_reviewed") progress = totalFlashcards / a.criteria_value;
        else if (a.criteria_type === "perfect_quiz") {
          const perfects = quizRes.data && quizRes.data.score === quizRes.data.total_questions ? 1 : 0;
          progress = perfects / a.criteria_value;
        }
        if (progress > nextProgress || !nextUp) {
          nextUp = a;
          nextProgress = Math.min(progress, 0.99);
        }
      }

      // Weak area
      const answersBySection: Record<string, { correct: number; total: number; subject: string; subsection: string }> = {};
      for (const a of answersRes.data ?? []) {
        const q = a.questions as any;
        if (!q?.subsection) continue;
        const key = `${q.subject}|${q.subsection}`;
        if (!answersBySection[key]) answersBySection[key] = { correct: 0, total: 0, subject: q.subject, subsection: q.subsection };
        answersBySection[key].total++;
        if (a.is_correct) answersBySection[key].correct++;
      }
      const weakAreas = Object.values(answersBySection)
        .filter((s) => s.total >= 3)
        .map((s) => ({ ...s, accuracy: s.correct / s.total }))
        .sort((a, b) => a.accuracy - b.accuracy);
      const weakArea = weakAreas[0] ?? null;

      // Recent quiz
      const recentQuiz = quizRes.data
        ? { score: quizRes.data.score, total: quizRes.data.total_questions, subject: quizRes.data.subject, date: quizRes.data.created_at }
        : null;

      // Upcoming tasks from plan
      let upcomingTasks: { day: number; date: string; topics: string[] }[] = [];
      if (planRes.data?.plan_json) {
        const plan = planRes.data.plan_json as any;
        const completions = (planRes.data.completions as any) ?? {};
        const today = new Date().toISOString().split("T")[0];
        const weeks = plan.weeks ?? [];
        for (const week of weeks) {
          for (const day of week.days ?? []) {
            if (day.date >= today && upcomingTasks.length < 3) {
              const incomplete = (day.tasks ?? []).filter((t: any) => !completions[t.id]);
              if (incomplete.length > 0) {
                upcomingTasks.push({
                  day: day.dayNumber,
                  date: day.date,
                  topics: incomplete.map((t: any) => t.topic).slice(0, 3),
                });
              }
            }
          }
        }
      }

      return {
        streak,
        xp,
        achievements: { earned, nextUp, nextProgress },
        weakArea,
        recentQuiz,
        recentFlashcards: totalFlashcards,
        upcomingTasks,
      };
    },
  });
};
