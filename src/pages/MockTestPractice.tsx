import { useState, useMemo, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Check, X, RotateCcw, ArrowLeft, Calculator, Menu, Save, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Layout from "@/components/Layout";
import MathText from "@/components/MathText";
import PassageBlock from "@/components/PassageBlock";
import DesmosCalculator from "@/components/DesmosCalculator";
import { useMockTestModules, useMockTestQuestions, useMockTests, getGuestSessionId, checkMockAnswer, getGuestMockAttempts, insertGuestMockAttempt, updateGuestMockAttempt } from "@/hooks/useMockTests";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { calculateSATScore } from "@/lib/satScoring";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";

const MAX_WRONG_ATTEMPTS = 3;

const MockTestPractice = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { data: tests } = useMockTests();
  const { data: modules } = useMockTestModules(testId);
  const { data: questions } = useMockTestQuestions(testId);

  const test = tests?.find((t) => t.id === testId);

  const [currentModuleIdx, setCurrentModuleIdx] = useState(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [correct, setCorrect] = useState<Record<string, boolean>>({});
  const [disabledOptions, setDisabledOptions] = useState<Record<string, Set<number>>>({});
  const [wrongCounts, setWrongCounts] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [showDesmos, setShowDesmos] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSaveExitDialog, setShowSaveExitDialog] = useState(false);
  const [resumedAttemptId, setResumedAttemptId] = useState<string | null>(null);
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, number>>({});

  // Load draft attempt on mount
  useEffect(() => {
    if (!testId || !modules?.length || !questions?.length) return;
    const loadDraft = async () => {
      let data: any[] | null = null;
      if (user) {
        const res = await supabase.from("mock_test_attempts")
          .select("*")
          .eq("test_id", testId)
          .eq("mode", "practice")
          .is("completed_at", null)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);
        data = res.data;
      } else {
        const res = await getGuestMockAttempts(getGuestSessionId(), testId);
        data = (res as any[])?.filter((a: any) => a.mode === "practice" && !a.completed_at)?.slice(0, 1) ?? null;
      }
      if (data?.[0]) {
        const draft = data[0];
        setResumedAttemptId(draft.id);
        const saved = (draft.answers as Record<string, any>) ?? {};
        const restoredAnswers: Record<string, number | null> = {};
        const restoredCorrect: Record<string, boolean> = {};
        const restoredDisabled: Record<string, Set<number>> = {};
        const restoredWrong: Record<string, number> = {};
        Object.entries(saved).forEach(([qId, val]) => {
          if (typeof val === "object" && val !== null) {
            restoredAnswers[qId] = val.selected ?? null;
            if (val.correct) restoredCorrect[qId] = true;
            if (val.disabledOptions) restoredDisabled[qId] = new Set(val.disabledOptions);
            if (val.wrongCount) restoredWrong[qId] = val.wrongCount;
          }
        });
        setAnswers(restoredAnswers);
        setCorrect(restoredCorrect);
        setChecked(Object.fromEntries(Object.keys(restoredCorrect).map(k => [k, true])));
        setDisabledOptions(restoredDisabled);
        setWrongCounts(restoredWrong);
        const savedProgress = (draft.time_spent as Record<string, any>) ?? {};
        if (savedProgress.moduleIdx !== undefined) {
          setCurrentModuleIdx(Number(savedProgress.moduleIdx));
          setCurrentQuestionIdx(Number(savedProgress.questionIdx ?? 0));
        }
        toast({ title: "Resumed from saved progress" });
      }
    };
    loadDraft();
  }, [testId, modules?.length, questions?.length]);

  const saveAndExit = async () => {
    if (!modules || !questions) return;
    try {
      const savedAnswers = Object.fromEntries(
        questions.map((q) => [q.id, {
          selected: answers[q.id] ?? null,
          correct: correct[q.id] ?? false,
          disabledOptions: disabledOptions[q.id] ? Array.from(disabledOptions[q.id]) : [],
          wrongCount: wrongCounts[q.id] ?? 0,
        }])
      );
      const savedTimeSpent = { moduleIdx: currentModuleIdx, questionIdx: currentQuestionIdx };

      if (user) {
        const attemptData: any = {
          test_id: testId, mode: "practice",
          started_at: new Date().toISOString(), completed_at: null,
          total_score: null, section_scores: {},
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
          await insertGuestMockAttempt(sessionId, testId!, "practice");
        }
      }
      toast({ title: "Progress saved" });
    } catch (e) { console.error("Failed to save", e); }
    navigate("/mock-tests");
  };

  const currentModule = modules?.[currentModuleIdx];
  const moduleQuestions = useMemo(
    () => questions?.filter((q) => q.module_id === currentModule?.id) ?? [],
    [questions, currentModule]
  );
  const currentQuestion = moduleQuestions[currentQuestionIdx];

  const handleSelect = (optionIdx: number) => {
    if (!currentQuestion || correct[currentQuestion.id]) return;
    const disabled = disabledOptions[currentQuestion.id];
    if (disabled?.has(optionIdx)) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optionIdx }));
    setChecked((prev) => ({ ...prev, [currentQuestion.id]: false }));
  };

  const handleCheck = async () => {
    if (!currentQuestion) return;
    const selected = answers[currentQuestion.id];
    if (selected === null || selected === undefined) return;

    try {
      const result = await checkMockAnswer(currentQuestion.id, selected);
      const isCorrect = result.is_correct;
      setChecked((prev) => ({ ...prev, [currentQuestion.id]: true }));
      setRevealedAnswers((prev) => ({ ...prev, [currentQuestion.id]: result.correct_answer }));

      if (isCorrect) {
        setCorrect((prev) => ({ ...prev, [currentQuestion.id]: true }));
      } else {
        const newCount = (wrongCounts[currentQuestion.id] ?? 0) + 1;
        setWrongCounts((prev) => ({ ...prev, [currentQuestion.id]: newCount }));
        setDisabledOptions((prev) => {
          const existing = prev[currentQuestion.id] ?? new Set();
          const next = new Set(existing);
          next.add(selected);
          return { ...prev, [currentQuestion.id]: next };
        });

        if (newCount >= MAX_WRONG_ATTEMPTS) {
          setCorrect((prev) => ({ ...prev, [currentQuestion.id]: true }));
          setAnswers((prev) => ({ ...prev, [currentQuestion.id]: result.correct_answer }));
        } else {
          setAnswers((prev) => ({ ...prev, [currentQuestion.id]: null }));
        }
      }
    } catch (e) {
      console.error("Failed to check answer", e);
      toast({ title: "Error checking answer", variant: "destructive" });
    }
  };

  const canProceed = currentQuestion ? correct[currentQuestion.id] === true : false;

  const navigateToQuestion = (modIdx: number, qIdx: number) => {
    setCurrentModuleIdx(modIdx);
    setCurrentQuestionIdx(qIdx);
    setSidebarOpen(false);
  };

  const handleNext = () => {
    if (currentQuestionIdx < moduleQuestions.length - 1) {
      setCurrentQuestionIdx((p) => p + 1);
    } else if (modules && currentModuleIdx < modules.length - 1) {
      setCurrentModuleIdx((p) => p + 1);
      setCurrentQuestionIdx(0);
    } else {
      finishTest();
    }
  };

  const handlePrev = () => {
    if (currentQuestionIdx > 0) {
      setCurrentQuestionIdx((p) => p - 1);
    } else if (currentModuleIdx > 0) {
      const prevModIdx = currentModuleIdx - 1;
      const prevModQuestions = questions?.filter((q) => q.module_id === modules?.[prevModIdx]?.id) ?? [];
      setCurrentModuleIdx(prevModIdx);
      setCurrentQuestionIdx(prevModQuestions.length - 1);
    }
  };

  const finishTest = async () => {
    if (!modules || !questions) return;
    const rwM1 = questions.filter((q) => q.module_name === "Reading & Writing" && q.module_order === 1 && correct[q.id]).length;
    const rwM2 = questions.filter((q) => q.module_name === "Reading & Writing" && q.module_order === 2 && correct[q.id]).length;
    const mathM1 = questions.filter((q) => q.module_name === "Math" && q.module_order === 1 && correct[q.id]).length;
    const mathM2 = questions.filter((q) => q.module_name === "Math" && q.module_order === 2 && correct[q.id]).length;
    const result = calculateSATScore(mathM1, mathM2, rwM1, rwM2);

    try {
      const attemptData: any = {
        test_id: testId, mode: "practice",
        started_at: new Date().toISOString(), completed_at: new Date().toISOString(),
        total_score: result.total,
        section_scores: { rw: result.rwScore, math: result.mathScore },
        answers: Object.fromEntries(
          questions.map((q) => [q.id, { selected: answers[q.id] ?? null, correct: correct[q.id] ?? false }])
        ),
        time_spent: {},
      };
      if (user) attemptData.user_id = user.id;
      else attemptData.session_id = getGuestSessionId();
      if (resumedAttemptId) {
        await supabase.from("mock_test_attempts").update(attemptData).eq("id", resumedAttemptId);
      } else {
        await supabase.from("mock_test_attempts").insert(attemptData);
      }
    } catch (e) { console.error("Failed to save attempt", e); }
    setShowResults(true);
  };

  const results = useMemo(() => {
    if (!showResults || !modules || !questions) return null;
    const rwM1 = questions.filter((q) => q.module_name === "Reading & Writing" && q.module_order === 1 && correct[q.id]).length;
    const rwM2 = questions.filter((q) => q.module_name === "Reading & Writing" && q.module_order === 2 && correct[q.id]).length;
    const mathM1 = questions.filter((q) => q.module_name === "Math" && q.module_order === 1 && correct[q.id]).length;
    const mathM2 = questions.filter((q) => q.module_name === "Math" && q.module_order === 2 && correct[q.id]).length;
    return calculateSATScore(mathM1, mathM2, rwM1, rwM2);
  }, [showResults, modules, questions, correct]);

  if (!test || !modules?.length || !questions?.length) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="h-8 w-8 mx-auto animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-4 text-muted-foreground">Loading test...</p>
        </div>
      </Layout>
    );
  }

  if (showResults && results) {
    return (
      <Layout>
        <div className="container mx-auto max-w-2xl px-4 py-8 sm:py-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">Practice Complete!</h1>
            <p className="text-muted-foreground mb-6 sm:mb-8">{test.title}</p>
            <div className="rounded-2xl border border-primary/20 bg-card p-6 sm:p-8 shadow-card mb-6">
              <p className="text-sm text-muted-foreground mb-2">Total Score</p>
              <p className="text-5xl sm:text-6xl font-bold text-gradient">{results.total}</p>
              <p className="text-sm text-muted-foreground mt-1">out of 1600</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-8">
              <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
                <p className="text-xs text-muted-foreground">Reading & Writing</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground">{results.rwScore}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
                <p className="text-xs text-muted-foreground">Math</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground">{results.mathScore}</p>
              </div>
            </div>
            <div className="flex gap-3 justify-center flex-wrap">
              <Button variant="outline" onClick={() => navigate("/mock-tests")}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Back to Tests
              </Button>
              <Button onClick={() => { setShowResults(false); setCurrentModuleIdx(0); setCurrentQuestionIdx(0); setAnswers({}); setChecked({}); setCorrect({}); setDisabledOptions({}); setWrongCounts({}); }}>
                <RotateCcw className="mr-1 h-4 w-4" /> Retake
              </Button>
            </div>
          </motion.div>
        </div>
      </Layout>
    );
  }

  const totalQ = questions.length;
  const answeredQ = Object.values(correct).filter(Boolean).length;
  const options = currentQuestion ? (currentQuestion.options as string[]) : [];
  const selectedAnswer = currentQuestion ? answers[currentQuestion.id] : null;
  const isChecked = currentQuestion ? checked[currentQuestion.id] : false;
  const isCorrect = currentQuestion ? correct[currentQuestion.id] : false;
  const currentDisabled = currentQuestion ? disabledOptions[currentQuestion.id] ?? new Set() : new Set();
  const autoRevealed = currentQuestion ? (wrongCounts[currentQuestion.id] ?? 0) >= MAX_WRONG_ATTEMPTS : false;

  // Sidebar content
  const SidebarNav = () => (
    <div className="space-y-3 p-3 sm:p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display text-xs sm:text-sm font-semibold text-foreground">Navigation</h3>
        <Badge variant="outline" className="text-[10px]">{answeredQ}/{totalQ}</Badge>
      </div>
      {modules?.map((mod, modIdx) => {
        const modQuestions = questions?.filter((q) => q.module_id === mod.id) ?? [];
        const isActive = modIdx === currentModuleIdx;
        return (
          <div key={mod.id}>
            <button
              onClick={() => navigateToQuestion(modIdx, 0)}
              className={`w-full text-left text-xs font-semibold px-2 py-1.5 rounded-lg transition-colors ${
                isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {mod.module_name === "Reading & Writing" ? "R&W" : mod.module_name} M{mod.module_order}
            </button>
            {isActive && (
              <div className="grid grid-cols-5 gap-1.5 mt-2 px-1">
                {modQuestions.map((q, qIdx) => {
                  const isCorrectQ = correct[q.id] === true;
                  const isCurrent = modIdx === currentModuleIdx && qIdx === currentQuestionIdx;
                  return (
                    <button
                      key={q.id}
                      onClick={() => navigateToQuestion(modIdx, qIdx)}
                      className={`h-7 w-7 rounded text-[10px] font-medium transition-all border ${
                        isCurrent
                          ? "border-primary bg-primary text-primary-foreground"
                          : isCorrectQ
                          ? "border-success/40 bg-success/10 text-success"
                          : "border-border bg-card text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      {qIdx + 1}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <Layout>
      <div className="container mx-auto max-w-6xl px-3 sm:px-4 py-4 sm:py-6">
        {/* Header - mobile optimized */}
        <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {isMobile && (
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-56 p-0">
                  <SheetHeader className="p-3 pb-0">
                    <SheetTitle className="text-sm">Questions</SheetTitle>
                  </SheetHeader>
                  <SidebarNav />
                </SheetContent>
              </Sheet>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate("/mock-tests")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="font-display text-sm sm:text-lg font-semibold text-foreground truncate">{test.title}</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {currentModule?.module_name === "Reading & Writing" ? "R&W" : currentModule?.module_name} M{currentModule?.module_order} •
                Q{currentQuestionIdx + 1}/{moduleQuestions.length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Badge variant="outline" className="text-[10px] sm:text-xs hidden sm:flex">{answeredQ}/{totalQ}</Badge>
            {currentModule?.module_name === "Math" && (
              <Button variant="outline" size="sm" className="h-8 text-xs hidden sm:flex" onClick={() => setShowDesmos(true)}>
                <Calculator className="mr-1 h-3.5 w-3.5" /> Calc
              </Button>
            )}
            {currentModule?.module_name === "Math" && isMobile && (
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setShowDesmos(true)}>
                <Calculator className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setShowSaveExitDialog(true)}>
              <Save className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 sm:h-1.5 w-full rounded-full bg-muted mb-4 sm:mb-6">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${(answeredQ / totalQ) * 100}%` }}
          />
        </div>

        <div className="flex gap-4 sm:gap-6">
          {/* Desktop sidebar */}
          {!isMobile && (
            <div className="w-48 lg:w-52 shrink-0">
              <div className="sticky top-24 rounded-2xl border border-border/80 bg-card shadow-card overflow-hidden">
                <SidebarNav />
              </div>
            </div>
          )}

          {/* Question area */}
          <div className="flex-1 min-w-0">
            {currentQuestion && (
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="rounded-2xl border border-border/80 bg-card p-4 sm:p-6 shadow-card"
              >
                {currentQuestion.passage && (
                  <div className="mb-4 rounded-xl bg-muted/50 p-3 sm:p-4 text-sm">
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
                  {options.map((opt, idx) => {
                    const isSelected = selectedAnswer === idx;
                    const isDisabled = currentDisabled.has(idx);
                    const showCorrectHighlight = isCorrect && revealedAnswers[currentQuestion.id] === idx;
                    const showWrongHighlight = isChecked && !isCorrect && isSelected && !autoRevealed;

                    let borderClass = "border-border/80 hover:border-primary/30";
                    if (showCorrectHighlight) borderClass = "border-success bg-success/5";
                    else if (showWrongHighlight) borderClass = "border-destructive bg-destructive/5";
                    else if (isDisabled) borderClass = "border-destructive/30 bg-destructive/5 opacity-50";
                    else if (isSelected && !isChecked) borderClass = "border-primary bg-primary/5";

                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelect(idx)}
                        disabled={isCorrect || isDisabled}
                        className={`w-full text-left rounded-xl border p-3 sm:p-4 transition-all ${borderClass} ${
                          isCorrect || isDisabled ? "cursor-default" : "cursor-pointer"
                        }`}
                      >
                        <div className="flex items-start gap-2 sm:gap-3">
                          <span className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full border text-[10px] sm:text-xs font-semibold">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span className="text-xs sm:text-sm text-foreground">
                            <MathText text={opt} />
                          </span>
                          {showCorrectHighlight && <Check className="ml-auto h-4 w-4 sm:h-5 sm:w-5 text-success shrink-0" />}
                          {isDisabled && !showCorrectHighlight && <X className="ml-auto h-4 w-4 sm:h-5 sm:w-5 text-destructive/50 shrink-0" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Explanation */}
                {isCorrect && currentQuestion.explanation && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 rounded-xl bg-success/5 border border-success/20 p-3 sm:p-4"
                  >
                    <p className="text-xs font-semibold text-success mb-1">
                      {autoRevealed ? "Correct Answer Revealed" : "Correct!"}
                    </p>
                    <div className="text-xs sm:text-sm text-foreground">
                      <MathText text={currentQuestion.explanation} />
                    </div>
                  </motion.div>
                )}

                {isChecked && !isCorrect && !autoRevealed && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 rounded-xl bg-destructive/5 border border-destructive/20 p-3 sm:p-4"
                  >
                    <p className="text-xs sm:text-sm text-destructive font-medium">
                      Incorrect — try again! ({MAX_WRONG_ATTEMPTS - (wrongCounts[currentQuestion.id] ?? 0)} left)
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-4 sm:mt-6 gap-2">
              <Button variant="outline" size="sm" className="text-xs sm:text-sm" onClick={handlePrev} disabled={currentModuleIdx === 0 && currentQuestionIdx === 0}>
                <ChevronLeft className="mr-0.5 sm:mr-1 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Prev
              </Button>
              <div className="flex gap-2">
                {!isCorrect && selectedAnswer !== null && selectedAnswer !== undefined && (
                  <Button size="sm" className="text-xs sm:text-sm" onClick={handleCheck}>Check</Button>
                )}
                {canProceed && (
                  <Button size="sm" className="gradient-primary text-primary-foreground text-xs sm:text-sm" onClick={handleNext}>
                    {currentModuleIdx === (modules?.length ?? 0) - 1 && currentQuestionIdx === moduleQuestions.length - 1
                      ? "Finish"
                      : "Next"}{" "}
                    <ChevronRight className="ml-0.5 sm:ml-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {currentModule?.module_name === "Math" && <DesmosCalculator open={showDesmos} onClose={() => setShowDesmos(false)} />}

      {/* Save & Exit Dialog */}
      <AlertDialog open={showSaveExitDialog} onOpenChange={setShowSaveExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save & Exit?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress will be saved. You can resume this practice test later from where you left off.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue</AlertDialogCancel>
            <AlertDialogAction onClick={saveAndExit}>
              <Save className="mr-1 h-4 w-4" /> Save & Exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default MockTestPractice;
