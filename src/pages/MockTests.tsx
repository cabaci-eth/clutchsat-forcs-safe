import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileText, Lock, Play, Clock, ArrowRight, Sparkles, Crown, CheckCircle2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription, isPremiumUser } from "@/hooks/useSubscription";
import { useMockTests, useMockTestAttempts, useMockTestQuestions } from "@/hooks/useMockTests";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import AttemptDetailsModal from "@/components/mock-tests/AttemptDetailsModal";

const MockTests = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: tests, isLoading } = useMockTests();
  const { data: attempts } = useMockTestAttempts(user?.id);
  const [viewingTestId, setViewingTestId] = useState<string | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("premium_until").eq("user_id", user!.id).single();
      return data;
    },
  });

  // Load questions for the test being viewed
  const { data: viewingQuestions } = useMockTestQuestions(viewingTestId ?? undefined);

  const premium = isPremiumUser(profile?.premium_until);

  const getTestAttempts = (testId: string) =>
    attempts?.filter((a) => a.test_id === testId) ?? [];

  const getBestScore = (testId: string) => {
    const testAttempts = getTestAttempts(testId).filter(a => a.total_score);
    if (!testAttempts.length) return null;
    return Math.max(...testAttempts.map((a) => a.total_score!));
  };

  const handleStart = (testId: string, isPremiumTest: boolean, mode: "practice" | "simulation") => {
    if (isPremiumTest && !premium) {
      navigate("/pricing");
      return;
    }
    navigate(`/mock-tests/${testId}/${mode}`);
  };

  const handleDeleteAttempt = async (attemptId: string) => {
    await supabase.from("mock_test_attempts").delete().eq("id", attemptId);
    queryClient.invalidateQueries({ queryKey: ["mock-test-attempts"] });
    toast({ title: "Attempt deleted" });
  };

  const handleResume = (attemptId: string, mode: string) => {
    if (!viewingTestId) return;
    navigate(`/mock-tests/${viewingTestId}/${mode}`);
  };

  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/10 blur-[100px]" />
          <div className="absolute top-1/2 -left-32 h-72 w-72 rounded-full bg-secondary/10 blur-[80px]" />
        </div>
        <div className="container relative mx-auto px-4 pt-12 pb-8 sm:pt-16 sm:pb-12 md:pt-20 md:pb-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="mb-4 sm:mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm font-medium text-primary backdrop-blur-sm">
              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Real Past SATs | Bluebook‑accurate format</span>
            </div>
            <h1 className="font-display text-3xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-4xl md:text-5xl lg:text-6xl">
              Full‑Length <span className="text-gradient">Practice Tests</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed px-2">
              Simulate the digital SAT experience using real past SATs with Bluebook‑accurate timing and adaptive scoring.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Test Cards */}
      <section className="container mx-auto px-4 py-8 sm:py-12">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : !tests?.length ? (
          <div className="mx-auto max-w-md text-center py-20">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">No tests available yet. Check back soon!</p>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl grid gap-4 sm:gap-5">
            {tests.map((test, i) => {
              const locked = test.is_premium && !premium;
              const testAttempts = getTestAttempts(test.id);
              const attemptCount = testAttempts.length;
              const bestScore = getBestScore(test.id);
              const completedCount = testAttempts.filter(a => a.completed_at).length;
              const draftCount = testAttempts.filter(a => !a.completed_at).length;

              return (
                <motion.div
                  key={test.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                  className={`rounded-2xl border bg-card p-4 sm:p-6 shadow-card transition-all ${
                    locked
                      ? "border-border/60 opacity-75"
                      : "border-border/80 hover:border-primary/20 card-hover"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top row: title + actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-display text-base sm:text-lg font-semibold text-foreground">{test.title}</h3>
                          {test.is_premium ? (
                            <Badge variant="secondary" className="gap-1 text-[10px]">
                              <Crown className="h-3 w-3" /> Premium
                            </Badge>
                          ) : (
                            <Badge className="bg-success/10 text-success border-success/20 text-[10px]">Free</Badge>
                          )}
                        </div>
                        {test.description && (
                          <p className="text-xs sm:text-sm text-muted-foreground mb-1.5">{test.description}</p>
                        )}
                        <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> ~2h 14m
                          </span>
                          <span>4 modules • 98 questions</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {locked ? (
                          <Button variant="outline" size="sm" asChild className="text-xs">
                            <Link to="/pricing">
                              <Lock className="mr-1 h-3.5 w-3.5" /> Upgrade
                            </Link>
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              onClick={() => handleStart(test.id, test.is_premium, "practice")}
                            >
                              Practice
                            </Button>
                            <Button
                              size="sm"
                              className="gradient-primary text-primary-foreground text-xs"
                              onClick={() => handleStart(test.id, test.is_premium, "simulation")}
                            >
                              <Play className="mr-1 h-3 w-3" /> Simulate
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Attempts summary row */}
                    {attemptCount > 0 && (
                      <div className="flex items-center justify-between border-t border-border/50 pt-2">
                        <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground flex-wrap">
                          {completedCount > 0 && (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-success" />
                              {completedCount} completed
                            </span>
                          )}
                          {draftCount > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-amber-500" />
                              {draftCount} in progress
                            </span>
                          )}
                          {bestScore && (
                            <span className="font-medium text-foreground">Best: {bestScore}</span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 gap-1"
                          onClick={() => setViewingTestId(test.id)}
                        >
                          <History className="h-3 w-3" /> View Attempts
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Info section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mx-auto max-w-3xl mt-8 sm:mt-12 rounded-2xl border border-border/80 bg-card p-4 sm:p-6 shadow-card"
        >
          <h3 className="font-display text-base sm:text-lg font-semibold text-foreground mb-3">How it works</h3>
          <div className="grid sm:grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground mb-1">Practice Mode</p>
              <p className="text-xs sm:text-sm">No timers. Check each answer immediately. Must get it right before moving on. Great for learning.</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Simulation Mode</p>
              <p className="text-xs sm:text-sm">Full Bluebook experience: timed modules, no going back, review screen, and a final score report.</p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Attempt Details Modal */}
      {viewingTestId && (
        <AttemptDetailsModal
          attempts={getTestAttempts(viewingTestId)}
          questions={(viewingQuestions ?? []) as any}
          testTitle={tests?.find(t => t.id === viewingTestId)?.title ?? "Test"}
          testId={viewingTestId}
          open={!!viewingTestId}
          onClose={() => setViewingTestId(null)}
          onDelete={handleDeleteAttempt}
          onResume={handleResume}
        />
      )}
    </Layout>
  );
};

export default MockTests;
