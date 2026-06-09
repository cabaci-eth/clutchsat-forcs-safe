import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Flag, Clock, ArrowLeft, RotateCcw, List, Calculator, Save, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import MathText from "@/components/MathText";
import PassageBlock from "@/components/PassageBlock";
import DesmosCalculator from "@/components/DesmosCalculator";
import { useMockTestModules, useMockTestQuestions, useMockTests, getGuestSessionId, scoreMockTest, getGuestMockAttempts, insertGuestMockAttempt, updateGuestMockAttempt } from "@/hooks/useMockTests";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { calculateSATScore } from "@/lib/satScoring";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const MockTestSimulation = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: tests } = useMockTests();
  const { data: modules } = useMockTestModules(testId);
  const { data: questions } = useMockTestQuestions(testId);
  const startTimeRef = useRef(Date.now());

  const test = tests?.find((t) => t.id === testId);

  const [currentModuleIdx, setCurrentModuleIdx] = useState(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [moduleStartTimes, setModuleStartTimes] = useState<Record<number, number>>({});
  const [moduleTimesSpent, setModuleTimesSpent] = useState<Record<number, number>>({});
  const [showReview, setShowReview] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showSaveExitDialog, setShowSaveExitDialog] = useState(false);
  const [showDesmos, setShowDesmos] = useState(false);
  const [resumedAttemptId, setResumedAttemptId] = useState<string | null>(null);
  const [scoreData, setScoreData] = useState<any>(null);

  const currentModule = modules?.[currentModuleIdx];
  const moduleQuestions = useMemo(
    () => questions?.filter((q) => q.module_id === currentModule?.id) ?? [],
    [questions, currentModule]
  );
  const currentQuestion = moduleQuestions[currentQuestionIdx];

  // Check for existing draft attempt to resume
  useEffect(() => {
    if (!testId || !modules?.length || !questions?.length) return;
    const loadDraft = async () => {
      let data: any[] | null = null;
      if (user) {
        const res = await supabase.from("mock_test_attempts")
          .select("*")
          .eq("test_id", testId)
          .eq("mode", "simulation")
          .is("completed_at", null)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);
        data = res.data;
      } else {
        const res = await getGuestMockAttempts(getGuestSessionId(), testId);
        data = (res as any[])?.filter((a: any) => a.mode === "simulation" && !a.completed_at)?.slice(0, 1) ?? null;
      }
      if (data?.[0]) {
        const draft = data[0];
        setResumedAttemptId(draft.id);
        const savedAnswers = (draft.answers as Record<string, any>) ?? {};
        const restoredAnswers: Record<string, number | null> = {};
        Object.entries(savedAnswers).forEach(([qId, val]) => {
          restoredAnswers[qId] = typeof val === "object" && val !== null ? val.selected : val;
        });
        setAnswers(restoredAnswers);

        const savedTime = (draft.time_spent as Record<string, any>) ?? {};
        const completedModules = Number(savedTime.completedModules ?? 0);
        const remainingTime = Number(savedTime.remainingTime ?? 0);
        if (completedModules > 0 && completedModules < modules.length) {
          setCurrentModuleIdx(completedModules);
          setCurrentQuestionIdx(0);
          if (remainingTime > 0) setTimeLeft(remainingTime);
        }
        toast({ title: "Resumed from saved progress" });
      }
    };
    loadDraft();
  }, [testId, modules?.length, questions?.length]);

  // Initialize timer when module changes
  useEffect(() => {
    if (currentModule && timeLeft === 0) {
      setTimeLeft(currentModule.time_limit_minutes * 60);
    }
    if (currentModule) {
      setModuleStartTimes((prev) => ({ ...prev, [currentModuleIdx]: Date.now() }));
    }
  }, [currentModule, currentModuleIdx]);

  // Timer countdown
  useEffect(() => {
    if (showResults || showReview) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          submitModule();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentModuleIdx, showResults, showReview]);

  // Request fullscreen on mount
  useEffect(() => {
    try { document.documentElement.requestFullscreen?.(); } catch {}
    return () => { try { document.exitFullscreen?.(); } catch {} };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleSelect = (optionIdx: number) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optionIdx }));
  };

  const toggleFlag = () => {
    if (!currentQuestion) return;
    setFlagged((prev) => {
      const next = new Set(prev);
      next.has(currentQuestion.id) ? next.delete(currentQuestion.id) : next.add(currentQuestion.id);
      return next;
    });
  };

  const submitModule = useCallback(() => {
    const start = moduleStartTimes[currentModuleIdx] ?? Date.now();
    const elapsed = Math.round((Date.now() - start) / 1000 / 60);
    setModuleTimesSpent((prev) => ({ ...prev, [currentModuleIdx]: elapsed }));

    if (modules && currentModuleIdx < modules.length - 1) {
      setCurrentModuleIdx((p) => p + 1);
      setCurrentQuestionIdx(0);
      setShowReview(false);
      setFlagged(new Set());
      setTimeLeft(0);
    } else {
      finishTest();
    }
  }, [currentModuleIdx, modules, moduleStartTimes]);

  const saveAndExit = async () => {
    if (!modules || !questions) return;
    try {
      const savedAnswers = Object.fromEntries(
        questions.map((q) => [q.id, { selected: answers[q.id] ?? null }])
      );
      const savedTimeSpent = { completedModules: currentModuleIdx, remainingTime: timeLeft };

      if (user) {
        const attemptData: any = {
          test_id: testId, mode: "simulation",
          started_at: new Date(startTimeRef.current).toISOString(),
          completed_at: null, total_score: null, section_scores: {},
          answers: savedAnswers, time_spent: savedTimeSpent,
          user_id: user.id,
        };
        if (resumedAttemptId) {
          await supabase.from("mock_test_attempts").update(attemptData).eq("id", resumedAttemptId);
        } else {
          await supabase.from("mock_test_attempts").insert(attemptData);
        }
      } else {
        const sessionId = getGuestSessionId();
        if (resumedAttemptId) {
          await updateGuestMockAttempt(sessionId, resumedAttemptId, {
            answers: savedAnswers, time_spent: savedTimeSpent,
          });
        } else {
          await insertGuestMockAttempt(sessionId, testId!, "simulation");
        }
      }

      toast({ title: "Progress saved" });
    } catch (e) {
      console.error("Failed to save", e);
    }
    try { document.exitFullscreen?.(); } catch {}
    navigate("/mock-tests");
  };

  const finishTest = async () => {
    if (!modules || !questions || !testId) return;

    const answersMap: Record<string, number | null> = {};
    questions.forEach((q: any) => { answersMap[q.id] = answers[q.id] ?? null; });

    try {
      const scoreResult = await scoreMockTest(testId, answersMap);
      const qResults = scoreResult.questions;

      let rwM1 = 0, rwM2 = 0, mathM1 = 0, mathM2 = 0;
      Object.entries(qResults).forEach(([, info]) => {
        if (!info.is_correct) return;
        if (info.module_name === "Reading & Writing" && info.module_order === 1) rwM1++;
        if (info.module_name === "Reading & Writing" && info.module_order === 2) rwM2++;
        if (info.module_name === "Math" && info.module_order === 1) mathM1++;
        if (info.module_name === "Math" && info.module_order === 2) mathM2++;
      });

      const result = calculateSATScore(mathM1, mathM2, rwM1, rwM2);

      const completedAnswers = Object.fromEntries(
        Object.entries(qResults).map(([qId, info]) => [qId, {
          selected: answers[qId] ?? null,
          correct: info.is_correct,
        }])
      );

      if (user) {
        const attemptData: any = {
          test_id: testId, mode: "simulation",
          started_at: new Date(startTimeRef.current).toISOString(),
          completed_at: new Date().toISOString(),
          total_score: result.total,
          section_scores: { rw: result.rwScore, math: result.mathScore },
          answers: completedAnswers,
          time_spent: moduleTimesSpent,
          user_id: user.id,
        };
        if (resumedAttemptId) {
          await supabase.from("mock_test_attempts").update(attemptData).eq("id", resumedAttemptId);
        } else {
          await supabase.from("mock_test_attempts").insert(attemptData);
        }
      } else {
        const sessionId = getGuestSessionId();
        if (resumedAttemptId) {
          await updateGuestMockAttempt(sessionId, resumedAttemptId, {
            answers: completedAnswers,
            completed_at: new Date().toISOString(),
            total_score: result.total,
            section_scores: { rw: result.rwScore, math: result.mathScore },
            time_spent: moduleTimesSpent,
          });
        } else {
          const newId = await insertGuestMockAttempt(sessionId, testId, "simulation");
          await updateGuestMockAttempt(sessionId, newId, {
            answers: completedAnswers,
            completed_at: new Date().toISOString(),
            total_score: result.total,
            section_scores: { rw: result.rwScore, math: result.mathScore },
            time_spent: moduleTimesSpent,
          });
        }
      }

      setScoreData({ ...result, rwM1, rwM2, mathM1, mathM2 });
    } catch (e) { console.error("Failed to save attempt", e); }

    try { document.exitFullscreen?.(); } catch {}
    setShowResults(true);
  };

  const results = scoreData;

  if (!test || !modules?.length || !questions?.length) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="h-8 w-8 mx-auto animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </Layout>
    );
  }

  if (showResults && results) {
    return (
      <Layout>
        <div className="container mx-auto max-w-2xl px-4 py-8 sm:py-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">Simulation Complete!</h1>
            <p className="text-muted-foreground mb-6 sm:mb-8">{test.title}</p>
            <div className="rounded-2xl border border-primary/20 bg-card p-6 sm:p-8 shadow-card mb-6">
              <p className="text-sm text-muted-foreground mb-2">Total Score</p>
              <p className="text-5xl sm:text-6xl font-bold text-gradient">{results.total}</p>
              <p className="text-sm text-muted-foreground mt-1">out of 1600 • {results.percentile}th percentile</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
              <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
                <p className="text-xs text-muted-foreground">Reading & Writing</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground">{results.rwScore}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">M1: {results.rwM1}/27 • M2: {results.rwM2}/27</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
                <p className="text-xs text-muted-foreground">Math</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground">{results.mathScore}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">M1: {results.mathM1}/22 • M2: {results.mathM2}/22</p>
              </div>
            </div>
            <div className="flex gap-3 justify-center mt-6 sm:mt-8">
              <Button variant="outline" onClick={() => navigate("/mock-tests")}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Back to Tests
              </Button>
            </div>
          </motion.div>
        </div>
      </Layout>
    );
  }

  // Review screen - centered
  if (showReview) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-3xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <h2 className="font-display text-lg sm:text-xl font-semibold text-foreground">
              Review — {currentModule?.module_name} M{currentModule?.module_order}
            </h2>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className={`font-mono font-semibold text-sm ${timeLeft < 60 ? "text-destructive" : "text-foreground"}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-7 gap-2 mb-6">
            {moduleQuestions.map((q, i) => {
              const answered = answers[q.id] !== null && answers[q.id] !== undefined;
              const isFlagged = flagged.has(q.id);
              return (
                <button
                  key={q.id}
                  onClick={() => { setCurrentQuestionIdx(i); setShowReview(false); }}
                  className={`h-9 sm:h-10 rounded-lg border text-xs sm:text-sm font-medium transition-all ${
                    isFlagged
                      ? "border-amber-400 bg-amber-400/10 text-amber-600"
                      : answered
                      ? "border-success/40 bg-success/10 text-success"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground mb-6 flex-wrap">
            <span className="flex items-center gap-1"><div className="h-3 w-3 rounded bg-success/30" /> Answered</span>
            <span className="flex items-center gap-1"><div className="h-3 w-3 rounded bg-amber-400/30" /> Flagged</span>
            <span className="flex items-center gap-1"><div className="h-3 w-3 rounded bg-muted" /> Unanswered</span>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setShowReview(false)}>Back to Questions</Button>
            <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => setShowSubmitDialog(true)}>
              Submit Module
            </Button>
          </div>
        </div>

        <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Submit this module?</AlertDialogTitle>
              <AlertDialogDescription>
                {moduleQuestions.filter((q) => answers[q.id] === null || answers[q.id] === undefined).length > 0
                  ? `You have ${moduleQuestions.filter((q) => answers[q.id] === null || answers[q.id] === undefined).length} unanswered question(s).`
                  : "All questions answered."}{" "}
                You cannot go back after submitting.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Go Back</AlertDialogCancel>
              <AlertDialogAction onClick={submitModule}>Submit</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  const options = currentQuestion ? (currentQuestion.options as string[]) : [];
  const selectedAnswer = currentQuestion ? answers[currentQuestion.id] : null;
  const isFlagged = currentQuestion ? flagged.has(currentQuestion.id) : false;

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      {/* Top bar - mobile optimized */}
      <div className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-sm px-3 sm:px-4 py-2 sm:py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
            <Badge variant="outline" className="text-[10px] sm:text-xs shrink-0 px-1.5 sm:px-2.5">
              <span className="hidden sm:inline">{currentModule?.module_name} </span>
              <span className="sm:hidden">{currentModule?.module_name === "Reading & Writing" ? "R&W" : "Math"} </span>
              M{currentModule?.module_order}
            </Badge>
            <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
              {currentQuestionIdx + 1}/{moduleQuestions.length}
            </span>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <div className={`flex items-center gap-1 font-mono text-xs sm:text-sm font-semibold ${
              timeLeft < 60 ? "text-destructive animate-pulse" : timeLeft < 300 ? "text-amber-500" : "text-foreground"
            }`}>
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {formatTime(timeLeft)}
            </div>

            {currentModule?.module_name === "Math" && (
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => setShowDesmos(true)}>
                <Calculator className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            )}

            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={toggleFlag}>
              <Flag className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isFlagged ? "fill-amber-400 text-amber-400" : ""}`} />
            </Button>

            <Button variant="outline" size="sm" className="h-8 sm:h-9 text-xs px-2 sm:px-3" onClick={() => setShowReview(true)}>
              <List className="h-3.5 w-3.5 sm:mr-1 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Review</span>
            </Button>

            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground" onClick={() => setShowSaveExitDialog(true)}>
              <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Question content - centered */}
      <div className="flex-1 flex justify-center px-3 sm:px-4 py-4 sm:py-6">
        <div className="w-full max-w-3xl">
          {currentQuestion && (
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              {currentQuestion.passage && (
                <div className="mb-4 rounded-xl bg-muted/50 p-3 sm:p-4 text-sm max-h-60 overflow-y-auto">
                  <PassageBlock passage={currentQuestion.passage} />
                </div>
              )}

              {(currentQuestion as any).image_url && (
                <div className="mb-4">
                  <img src={(currentQuestion as any).image_url} alt="Question image" className="max-h-64 rounded-xl object-contain" />
                </div>
              )}

              <div className="mb-4 sm:mb-6">
                <MathText text={currentQuestion.question_text} />
              </div>

              <div className="space-y-2 sm:space-y-3">
                {options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelect(idx)}
                    className={`w-full text-left rounded-xl border p-3 sm:p-4 transition-all ${
                      selectedAnswer === idx
                        ? "border-primary bg-primary/5"
                        : "border-border/80 hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-start gap-2 sm:gap-3">
                      <span className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full border text-[10px] sm:text-xs font-semibold">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="text-xs sm:text-sm text-foreground">
                        <MathText text={opt} />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Bottom nav */}
      <div className="sticky bottom-0 border-t border-border bg-card/95 backdrop-blur-sm px-3 sm:px-4 py-2 sm:py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            className="text-xs sm:text-sm"
            onClick={() => setCurrentQuestionIdx((p) => Math.max(0, p - 1))}
            disabled={currentQuestionIdx === 0}
          >
            <ChevronLeft className="mr-0.5 sm:mr-1 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Back
          </Button>
          {currentQuestionIdx < moduleQuestions.length - 1 ? (
            <Button size="sm" className="text-xs sm:text-sm" onClick={() => setCurrentQuestionIdx((p) => p + 1)}>
              Next <ChevronRight className="ml-0.5 sm:ml-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          ) : (
            <Button size="sm" className="gradient-primary text-primary-foreground text-xs sm:text-sm" onClick={() => setShowReview(true)}>
              Review & Submit
            </Button>
          )}
        </div>
      </div>

      {currentModule?.module_name === "Math" && <DesmosCalculator open={showDesmos} onClose={() => setShowDesmos(false)} />}

      {/* Save & Exit Dialog */}
      <AlertDialog open={showSaveExitDialog} onOpenChange={setShowSaveExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save & Exit?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress will be saved. You can resume this test later from where you left off.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Test</AlertDialogCancel>
            <AlertDialogAction onClick={saveAndExit}>
              <Save className="mr-1 h-4 w-4" /> Save & Exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MockTestSimulation;
