import { useState, useRef, useMemo } from "react";
import { Loader2, LogIn, Trash2, FileText, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { useProgressData, TimeRange } from "@/hooks/useProgressData";
import TimeRangeFilter from "@/components/progress/TimeRangeFilter";
import StatsGrid from "@/components/progress/StatsGrid";
import AccuracyTrendChart from "@/components/progress/AccuracyTrendChart";
import SubjectBreakdown from "@/components/progress/SubjectBreakdown";
import RecentQuizzes from "@/components/progress/RecentQuizzes";
import PdfExportButton from "@/components/progress/PdfExportButton";
import MockTestHistory from "@/components/progress/MockTestHistory";

const Progress = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [resetting, setResetting] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const contentRef = useRef<HTMLDivElement>(null);

  const { userAnswers, quizAttempts, streak, xp, savedCount, isLoading } = useProgressData(user?.id, timeRange);

  const stats = useMemo(() => {
    const total = userAnswers.length;
    const correct = userAnswers.filter((a) => a.is_correct).length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

    const subjects: Record<string, { total: number; correct: number }> = {};
    const subsectionStats: Record<string, { total: number; correct: number }> = {};
    const subSubsectionStats: Record<string, { total: number; correct: number }> = {};
    const difficultyStats: Record<string, { total: number; correct: number }> = {};

    userAnswers.forEach((a) => {
      const q = a.questions as any;
      const subj = q?.subject || "Unknown";
      const sub = q?.subsection || null;
      const subSub = q?.sub_subsection || null;
      const diff = q?.difficulty || "Medium";

      if (!subjects[subj]) subjects[subj] = { total: 0, correct: 0 };
      subjects[subj].total++;
      if (a.is_correct) subjects[subj].correct++;

      if (!difficultyStats[diff]) difficultyStats[diff] = { total: 0, correct: 0 };
      difficultyStats[diff].total++;
      if (a.is_correct) difficultyStats[diff].correct++;

      if (sub) {
        if (!subsectionStats[sub]) subsectionStats[sub] = { total: 0, correct: 0 };
        subsectionStats[sub].total++;
        if (a.is_correct) subsectionStats[sub].correct++;
      }
      if (subSub) {
        if (!subSubsectionStats[subSub]) subSubsectionStats[subSub] = { total: 0, correct: 0 };
        subSubsectionStats[subSub].total++;
        if (a.is_correct) subSubsectionStats[subSub].correct++;
      }
    });

    // Weakest area (min 5 attempts)
    const weakestArea = Object.entries(subsectionStats)
      .filter(([, d]) => d.total >= 5)
      .map(([name, d]) => ({ name, accuracy: Math.round((d.correct / d.total) * 100) }))
      .sort((a, b) => a.accuracy - b.accuracy)[0] ?? null;

    const avgQuizScore = quizAttempts.length > 0
      ? Math.round(quizAttempts.reduce((s, q) => s + (q.score / q.total_questions) * 100, 0) / quizAttempts.length)
      : 0;

    return { total, correct, accuracy, subjects, subsectionStats, subSubsectionStats, difficultyStats, weakestArea, avgQuizScore };
  }, [userAnswers, quizAttempts]);

  const handleReset = async () => {
    if (!user) return;
    setResetting(true);
    try {
      await Promise.all([
        supabase.from("user_answers").delete().eq("user_id", user.id),
        supabase.from("quiz_attempts").delete().eq("user_id", user.id),
        supabase.from("user_flashcard_reviews").delete().eq("user_id", user.id),
        supabase.from("saved_questions").delete().eq("user_id", user.id),
      ]);
      queryClient.invalidateQueries({ queryKey: ["progress_answers"] });
      queryClient.invalidateQueries({ queryKey: ["progress_quizzes"] });
      queryClient.invalidateQueries({ queryKey: ["saved_count"] });
      queryClient.invalidateQueries({ queryKey: ["user_answers"] });
      queryClient.invalidateQueries({ queryKey: ["user_answers_detail"] });
      queryClient.invalidateQueries({ queryKey: ["quiz_attempts"] });
      queryClient.invalidateQueries({ queryKey: ["user_answer_ids"] });
      queryClient.invalidateQueries({ queryKey: ["saved_question_ids"] });
      toast({ title: "Progress reset", description: "All your data has been cleared." });
    } catch {
      toast({ title: "Error", description: "Failed to reset progress.", variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="font-display text-3xl font-bold text-foreground mb-4">Your Progress</h1>
          <p className="text-muted-foreground mb-6">Sign in to track your SAT preparation journey.</p>
          <Button className="gradient-primary text-primary-foreground" asChild>
            <Link to="/login"><LogIn className="mr-2 h-4 w-4" /> Sign In</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return <Layout><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></Layout>;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">Your Progress</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Track your SAT preparation journey</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <TimeRangeFilter value={timeRange} onChange={setTimeRange} />
            <PdfExportButton contentRef={contentRef as React.RefObject<HTMLDivElement>} timeRange={timeRange} />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1">
                  <Trash2 className="h-3.5 w-3.5" /> Reset
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>This will permanently delete all your answer history, quiz attempts, flashcard reviews, and saved questions.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReset} disabled={resetting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {resetting ? "Resetting…" : "Yes, Reset Everything"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Main content for PDF export */}
        <div ref={contentRef} className="space-y-6">
          <StatsGrid
            total={stats.total}
            correct={stats.correct}
            accuracy={stats.accuracy}
            currentStreak={streak?.current_streak ?? 0}
            avgQuizScore={stats.avgQuizScore}
            xpEarned={xp?.total_xp ?? 0}
            weakestArea={stats.weakestArea}
            savedCount={savedCount}
          />

          <AccuracyTrendChart answers={userAnswers} />

          <SubjectBreakdown
            subjects={stats.subjects}
            subsectionStats={stats.subsectionStats}
            subSubsectionStats={stats.subSubsectionStats}
            difficultyStats={stats.difficultyStats}
          />

          <RecentQuizzes quizzes={quizAttempts} />

          {/* Mock Test History */}
          {user && <MockTestHistory userId={user.id} />}

          {stats.total === 0 && quizAttempts.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-10 text-muted-foreground"
            >
              <p>No progress yet. Start practicing to see your stats here!</p>
              <Button className="mt-4 gradient-primary text-primary-foreground" asChild>
                <Link to="/practice">Start Practicing</Link>
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Progress;
