import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Timer, ArrowRight, RotateCcw, Trophy, Loader2, CalculatorIcon, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import DesmosCalculator from "@/components/DesmosCalculator";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { useAceContext } from "@/contexts/AceContext";
import PassageBlock from "@/components/PassageBlock";
import BookmarkButton from "@/components/BookmarkButton";
import MathText from "@/components/MathText";
import { checkNumericAnswer, isValidGridInInput } from "@/lib/mathUtils";
import QuestionMedia from "@/components/QuestionMedia";
import { SAT_HIERARCHY, isEnglish, getSubSubsections } from "@/lib/satStructure";

const difficultyColors: Record<string, string> = {
  Easy: "bg-success/10 text-success border-success/30",
  Medium: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700",
  Hard: "bg-destructive/10 text-destructive border-destructive/30",
};

type Question = {
  id: string;
  subject: string;
  question_text: string;
  options: string[];
  correct_answer: number;
  explanation: string;
  difficulty: string | null;
  subsection: string | null;
  sub_subsection: string | null;
  passage: string | null;
  question_type: string | null;
  correct_answer_numeric: number | null;
};

const Quiz = () => {
  const [stage, setStage] = useState<"setup" | "quiz" | "results">("setup");
  const [subjectFilter, setSubjectFilter] = useState<"All" | "Math" | "English">("All");
  const [subsections, setSubsections] = useState<string[]>([]);
  const [subSubsections, setSubSubsections] = useState<string[]>([]);
  const [difficulties, setDifficulties] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "unsolved" | "saved">("all");
  const [mistakesFilter, setMistakesFilter] = useState<"none" | "all" | "never_corrected" | "later_corrected">("none");
  const [mistakesExpanded, setMistakesExpanded] = useState(true);
  const [numQ, setNumQ] = useState(5);
  const [timeLimit, setTimeLimit] = useState(30);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | string | null)[]>([]);
  const [timer, setTimer] = useState(30);
  const [showExplanation, setShowExplanation] = useState(false);
  const [totalTime, setTotalTime] = useState(0);
  const [desmosOpen, setDesmosOpen] = useState(false);
  const [gridInInput, setGridInInput] = useState("");
  const [expandedSubs, setExpandedSubs] = useState<Record<string, boolean>>({});
  const { user } = useAuth();
  const { setQuestionContext, clearQuestionContext } = useAceContext();

  // Set Ace context for current quiz question
  useEffect(() => {
    if (stage !== "quiz" || !questions.length) {
      clearQuestionContext();
      return;
    }
    const q = questions[current];
    if (q) {
      setQuestionContext({
        questionText: q.question_text,
        options: q.options as string[],
        subject: q.subject,
        passage: q.passage || undefined,
      });
    }
    return () => clearQuestionContext();
  }, [stage, current, questions]);

  const { data: allQuestions = [], isLoading } = useQuery({
    queryKey: ["questions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("questions").select("*");
      if (error) throw error;
      return data.map((q) => ({ ...q, options: (Array.isArray(q.options) ? q.options : []) as string[] })) as Question[];
    },
  });

  const { data: solvedIds = [] } = useQuery({
    queryKey: ["user_answer_ids", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("user_answers").select("question_id").eq("user_id", user!.id);
      return [...new Set((data || []).map((a) => a.question_id))];
    },
  });

  const { data: savedIds = [] } = useQuery({
    queryKey: ["saved_question_ids", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("saved_questions").select("question_id").eq("user_id", user!.id);
      return (data || []).map((s) => s.question_id);
    },
  });

  const { data: questionSummary = [] } = useQuery({
    queryKey: ["question_summary", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("user_question_summary").select("question_id, ever_correct, ever_incorrect").eq("user_id", user!.id);
      return data || [];
    },
  });

  const solvedSet = new Set(solvedIds);
  const savedSet = new Set(savedIds);
  const mistakesMap = useMemo(() => {
    const map = new Map<string, { ever_correct: boolean; ever_incorrect: boolean }>();
    questionSummary.forEach((s: any) => map.set(s.question_id, { ever_correct: s.ever_correct, ever_incorrect: s.ever_incorrect }));
    return map;
  }, [questionSummary]);

  const availableHierarchy = useMemo(() => {
    if (subjectFilter === "Math") return { Math: SAT_HIERARCHY.Math };
    if (subjectFilter === "English") return { English: SAT_HIERARCHY.English };
    return SAT_HIERARCHY;
  }, [subjectFilter]);

  const mistakeCounts = useMemo(() => {
    let base = allQuestions;
    if (subjectFilter === "Math") base = base.filter((q) => q.subject === "Math");
    else if (subjectFilter === "English") base = base.filter((q) => isEnglish(q.subject));
    if (subsections.length > 0) base = base.filter((q) => q.subsection && subsections.includes(q.subsection));
    if (subSubsections.length > 0) base = base.filter((q) => q.sub_subsection && subSubsections.includes(q.sub_subsection));
    if (difficulties.length > 0) base = base.filter((q) => q.difficulty && difficulties.includes(q.difficulty));
    if (statusFilter === "unsolved") base = base.filter((q) => !solvedSet.has(q.id));
    if (statusFilter === "saved") base = base.filter((q) => savedSet.has(q.id));
    const allMistakes = base.filter((q) => mistakesMap.get(q.id)?.ever_incorrect).length;
    const neverCorrected = base.filter((q) => { const s = mistakesMap.get(q.id); return !!s?.ever_incorrect && !s.ever_correct; }).length;
    const laterCorrected = base.filter((q) => { const s = mistakesMap.get(q.id); return !!s?.ever_incorrect && !!s.ever_correct; }).length;
    return { allMistakes, neverCorrected, laterCorrected };
  }, [allQuestions, subjectFilter, subsections, subSubsections, difficulties, statusFilter, solvedSet, savedSet, mistakesMap]);

  const toggleSub = (s: string) => setSubsections((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  const toggleSubSub = (s: string) => setSubSubsections((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  const toggleDiff = (d: string) => setDifficulties((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);

  const filteredPool = useMemo(() => {
    let pool = allQuestions;
    if (subjectFilter === "Math") pool = pool.filter((q) => q.subject === "Math");
    else if (subjectFilter === "English") pool = pool.filter((q) => isEnglish(q.subject));
    if (subsections.length > 0) pool = pool.filter((q) => q.subsection && subsections.includes(q.subsection));
    if (subSubsections.length > 0) pool = pool.filter((q) => q.sub_subsection && subSubsections.includes(q.sub_subsection));
    if (difficulties.length > 0) pool = pool.filter((q) => q.difficulty && difficulties.includes(q.difficulty));
    if (statusFilter === "unsolved") pool = pool.filter((q) => !solvedSet.has(q.id));
    if (statusFilter === "saved") pool = pool.filter((q) => savedSet.has(q.id));

    // Mistakes filter
    if (mistakesFilter !== "none") {
      pool = pool.filter((q) => {
        const s = mistakesMap.get(q.id);
        if (!s || !s.ever_incorrect) return false;
        if (mistakesFilter === "all") return true;
        if (mistakesFilter === "never_corrected") return !s.ever_correct;
        if (mistakesFilter === "later_corrected") return s.ever_correct;
        return true;
      });
    }

    return pool;
  }, [allQuestions, subjectFilter, subsections, subSubsections, difficulties, statusFilter, mistakesFilter, solvedSet, savedSet, mistakesMap]);

  const filteredCount = filteredPool.length;

  useEffect(() => {
    if (filteredCount > 0 && numQ > filteredCount) {
      setNumQ(filteredCount);
    }
  }, [filteredCount]);

  const startQuiz = () => {
    const clampedNum = Math.max(1, Math.min(numQ, filteredCount));
    const shuffled = [...filteredPool].sort(() => Math.random() - 0.5).slice(0, clampedNum);
    setQuestions(shuffled);
    setAnswers(new Array(shuffled.length).fill(null));
    setCurrent(0);
    setTimer(timeLimit);
    setTotalTime(0);
    setShowExplanation(false);
    setGridInInput("");
    setStage("quiz");
  };

  useEffect(() => {
    if (stage !== "quiz" || showExplanation) return;
    const interval = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) { handleAnswer(-1); return timeLimit; }
        return t - 1;
      });
      setTotalTime((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [stage, current, showExplanation]);

  const handleAnswer = useCallback((idx: number | string) => {
    if (showExplanation) return;
    setAnswers((prev) => { const n = [...prev]; n[current] = idx; return n; });
    setShowExplanation(true);

    if (user && questions[current]) {
      const q = questions[current];
      const isGridIn = q.question_type === "grid-in";
      let isCorrect = false;
      let selectedAnswer = -1;

      if (isGridIn && typeof idx === "string") {
        isCorrect = q.correct_answer_numeric !== null && checkNumericAnswer(idx, q.correct_answer_numeric);
        selectedAnswer = isCorrect ? q.correct_answer : -1;
      } else {
        selectedAnswer = idx as number;
        isCorrect = idx === q.correct_answer;
      }

      supabase.from("user_answers").insert({
        user_id: user.id, question_id: q.id, selected_answer: selectedAnswer, is_correct: false,
      }).then();
    }
  }, [current, showExplanation, user, questions]);

  const nextQuestion = useCallback(() => {
    setShowExplanation(false);
    setGridInInput("");
    if (current + 1 >= questions.length) {
      finishQuiz();
    } else {
      setCurrent(current + 1);
      setTimer(timeLimit);
    }
  }, [current, questions.length, timeLimit]);

  const isCorrectAnswer = (a: number | string | null, q: Question) => {
    if (a === null) return false;
    if (q?.question_type === "grid-in" && typeof a === "string") {
      return q.correct_answer_numeric !== null && checkNumericAnswer(a, q.correct_answer_numeric);
    }
    return a === q?.correct_answer;
  };

  const finishQuiz = async () => {
    const finalScore = answers.filter((a, i) => isCorrectAnswer(a, questions[i])).length;
    setStage("results");
    if (user) {
      await supabase.from("quiz_attempts").insert({
        user_id: user.id,
        subject: subjectFilter === "All" ? null : subjectFilter,
        score: finalScore,
        total_questions: questions.length,
        time_taken: totalTime,
      });
    }
  };

  const score = answers.filter((a, i) => isCorrectAnswer(a, questions[i])).length;
  const q = questions[current];

  const getPassageLabel = (subject: string) => isEnglish(subject) ? "Passage" : "Context";

  // Keyboard shortcuts for quiz stage
  useEffect(() => {
    if (stage !== "quiz" || !q) return;
    const handler = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") {
        // Only capture Enter for grid-in submit
        if (e.key === "Enter" && q.question_type === "grid-in" && !showExplanation && gridInInput.trim()) {
          e.preventDefault();
          handleAnswer(gridInInput);
        }
        return;
      }

      if (showExplanation) {
        // After answer revealed: Enter or N → next
        if (e.key === "Enter" || e.key === "n" || e.key === "N") {
          e.preventDefault();
          nextQuestion();
        }
      } else {
        // Multiple choice: 1-4 to select
        if (q.question_type !== "grid-in" && q.options.length > 0) {
          const num = parseInt(e.key);
          if (num >= 1 && num <= Math.min(4, q.options.length)) {
            e.preventDefault();
            handleAnswer(num - 1);
          }
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [stage, q, showExplanation, gridInInput, handleAnswer, nextQuestion]);

  return (
    <Layout>
      <div className="container mx-auto max-w-2xl px-4 py-10">
        {stage === "setup" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">Quiz Mode</h1>
            <p className="text-muted-foreground mb-8">Configure your quiz and test your skills.</p>
            {isLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : (
              <div className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-card">
                <div>
                  <label className="text-sm font-medium text-foreground">Subject</label>
                  <div className="mt-2 flex gap-2">
                    {(["All", "Math", "English"] as const).map((s) => (
                      <Button key={s} size="sm" variant={subjectFilter === s ? "default" : "outline"} className={subjectFilter === s ? "gradient-primary text-primary-foreground" : ""} onClick={() => { setSubjectFilter(s); setSubsections([]); setSubSubsections([]); }}>{s}</Button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">Categories (optional)</label>
                  <div className="mt-2 space-y-2">
                    {Object.entries(availableHierarchy).map(([subject, subs]) => (
                      <div key={subject}>
                        {Object.entries(subs).map(([subsection, subSubs]) => (
                          <div key={subsection} className="mb-2">
                            <div className="flex items-center gap-2">
                              <Checkbox checked={subsections.includes(subsection)} onCheckedChange={() => toggleSub(subsection)} />
                              <button onClick={() => setExpandedSubs((p) => ({ ...p, [subsection]: !p[subsection] }))} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                                {expandedSubs[subsection] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                {subsection}
                              </button>
                            </div>
                            {expandedSubs[subsection] && (
                              <div className="ml-8 mt-1 space-y-1">
                                {subSubs.map((ss) => (
                                  <label key={ss} className="flex items-center gap-2 text-xs cursor-pointer">
                                    <Checkbox checked={subSubsections.includes(ss)} onCheckedChange={() => toggleSubSub(ss)} />
                                    <span className="text-muted-foreground">{ss}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">Difficulty (optional)</label>
                  <div className="mt-2 flex gap-3">
                    {["Easy", "Medium", "Hard"].map((d) => (
                      <label key={d} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={difficulties.includes(d)} onCheckedChange={() => toggleDiff(d)} />
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${difficultyColors[d]}`}>{d}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {user && (
                  <div>
                    <label className="text-sm font-medium text-foreground">Question Status</label>
                    <div className="mt-2 flex gap-2">
                      {([["all", "All"], ["unsolved", "Unsolved Only"], ["saved", "Saved Only"]] as const).map(([val, label]) => (
                        <Button key={val} size="sm" variant={statusFilter === val ? "default" : "outline"} onClick={() => setStatusFilter(val as any)}>{label}</Button>
                      ))}
                    </div>
                  </div>
                )}

                {user && (
                  <div>
                    <label className="text-sm font-medium text-foreground">Mistakes</label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={mistakesFilter === "all"}
                          onCheckedChange={(checked) => setMistakesFilter(checked ? "all" : "none")}
                        />
                        <span className="text-muted-foreground flex-1 cursor-pointer" onClick={() => setMistakesFilter(mistakesFilter === "all" ? "none" : "all")}>All Mistakes ({mistakeCounts.allMistakes})</span>
                        <button onClick={() => setMistakesExpanded(!mistakesExpanded)} className="p-0.5 hover:bg-muted rounded">
                          {mistakesExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                        </button>
                      </div>
                      {mistakesExpanded && (
                        <div className="ml-6 space-y-2">
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox
                              checked={mistakesFilter === "never_corrected" || mistakesFilter === "all"}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  if (mistakesFilter === "later_corrected") setMistakesFilter("all");
                                  else setMistakesFilter("never_corrected");
                                } else {
                                  if (mistakesFilter === "all") setMistakesFilter("later_corrected");
                                  else setMistakesFilter("none");
                                }
                              }}
                            />
                            <span className="text-muted-foreground">Never corrected ({mistakeCounts.neverCorrected})</span>
                          </label>
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox
                              checked={mistakesFilter === "later_corrected" || mistakesFilter === "all"}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  if (mistakesFilter === "never_corrected") setMistakesFilter("all");
                                  else setMistakesFilter("later_corrected");
                                } else {
                                  if (mistakesFilter === "all") setMistakesFilter("never_corrected");
                                  else setMistakesFilter("none");
                                }
                              }}
                            />
                            <span className="text-muted-foreground">Later corrected ({mistakeCounts.laterCorrected})</span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-foreground">
                    Questions: {numQ} <span className="text-muted-foreground font-normal">/ {filteredCount} available</span>
                  </label>
                  <input type="range" min={1} max={Math.max(1, Math.min(filteredCount, 50))} value={Math.min(numQ, filteredCount)} onChange={(e) => setNumQ(Math.max(1, Math.min(+e.target.value, filteredCount)))} className="mt-2 w-full accent-primary" disabled={filteredCount === 0} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Time per question: {timeLimit}s</label>
                  <input type="range" min={10} max={120} step={5} value={timeLimit} onChange={(e) => setTimeLimit(+e.target.value)} className="mt-2 w-full accent-primary" />
                </div>
                {filteredCount === 0 ? (
                  <p className="text-sm text-destructive text-center py-2">No questions match your criteria.</p>
                ) : (
                  <Button className="w-full gradient-primary text-primary-foreground shadow-glow" onClick={startQuiz}>Start Quiz ({filteredCount} available)</Button>
                )}
              </div>
            )}
          </motion.div>
        )}

        {stage === "quiz" && q && (
          <motion.div key={current} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Question {current + 1}/{questions.length}</span>
              <div className="flex items-center gap-2">
                <BookmarkButton questionId={q.id} isSaved={savedSet.has(q.id)} />
                <Button size="sm" variant="ghost" onClick={() => setDesmosOpen(true)}>
                  <CalculatorIcon className="h-4 w-4" />
                </Button>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary"><Timer className="h-3.5 w-3.5" /> {timer}s</span>
              </div>
            </div>
            <div className="w-full rounded-full bg-muted h-1.5 mb-6"><div className="h-1.5 rounded-full gradient-primary transition-all" style={{ width: `${((current + 1) / questions.length) * 100}%` }} /></div>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {q.subsection && <span className="text-xs rounded-full bg-primary/10 px-2.5 py-0.5 text-primary font-medium">{q.subsection}</span>}
                {q.sub_subsection && <span className="text-xs rounded-full bg-muted px-2.5 py-0.5 text-muted-foreground font-medium">{q.sub_subsection}</span>}
                {q.difficulty && <span className={`text-xs rounded-full px-2.5 py-0.5 font-medium border ${difficultyColors[q.difficulty]}`}>{q.difficulty}</span>}
                {q.question_type === "grid-in" && <span className="text-xs rounded-full bg-secondary/10 px-2.5 py-0.5 text-secondary font-medium">Grid-In</span>}
              </div>

              {q.passage && <PassageBlock passage={q.passage} label={getPassageLabel(q.subject)} />}
              <QuestionMedia questionId={q.id} />

              <div className="text-lg font-medium text-foreground mb-6 break-words overflow-wrap-anywhere">
                <MathText text={q.question_text} />
              </div>

              {q.question_type === "grid-in" ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="Enter answer (e.g. 3/4, 1.5, 2 1/3)..."
                      value={gridInInput}
                      onChange={(e) => {
                        if (isValidGridInInput(e.target.value) || e.target.value === "") setGridInInput(e.target.value);
                      }}
                      disabled={showExplanation}
                      className="max-w-xs"
                    />
                    {!showExplanation && (
                      <Button onClick={() => handleAnswer(gridInInput)} disabled={!gridInInput.trim()}>Submit</Button>
                    )}
                  </div>
                  {showExplanation && (
                    <div className={`rounded-xl p-3 text-sm ${
                      q.correct_answer_numeric !== null && checkNumericAnswer(gridInInput, q.correct_answer_numeric)
                        ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                    }`}>
                      Your answer: {gridInInput} | Correct: {q.correct_answer_numeric}
                    </div>
                  )}
                </div>
              ) : q.options.length > 0 ? (
                <div className="space-y-3">
                  {q.options.map((opt, idx) => {
                    let cls = "border border-border bg-background hover:bg-muted text-foreground";
                    if (showExplanation) {
                      if (idx === q.correct_answer) cls = "border-success bg-success/10 text-success";
                      else if (idx === answers[current]) cls = "border-destructive bg-destructive/10 text-destructive";
                      else cls = "border border-border bg-background text-muted-foreground opacity-50";
                    }
                    return (
                      <button key={idx} onClick={() => handleAnswer(idx)} disabled={showExplanation} className={`w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition-all break-words ${cls}`}>
                        <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded bg-muted text-[10px] font-bold text-muted-foreground">{idx + 1}</span>
                        <MathText text={opt} />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm italic">No options available.</p>
              )}

              {showExplanation && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
                  <div className="rounded-xl bg-muted p-4 text-sm text-muted-foreground break-words">
                    <strong className="text-foreground">Explanation:</strong> <MathText text={q.explanation} />
                  </div>
                  <Button className="mt-4 w-full gradient-primary text-primary-foreground" onClick={nextQuestion}>
                    {current + 1 >= questions.length ? "See Results" : "Next"} <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                  <p className="mt-2 text-center text-xs text-muted-foreground">Press <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">Enter</kbd> or <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">N</kbd> for next</p>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {stage === "results" && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full gradient-primary shadow-glow">
              <Trophy className="h-10 w-10 text-primary-foreground" />
            </div>
            <h2 className="font-display text-3xl font-bold text-foreground">Quiz Complete!</h2>
            <p className="mt-2 text-muted-foreground">You scored {score} out of {questions.length}</p>
            <div className="mx-auto mt-6 grid max-w-xs grid-cols-2 gap-4">
              <div className="rounded-2xl bg-card border border-border p-4 shadow-card"><div className="font-display text-2xl font-bold text-primary">{questions.length > 0 ? Math.round((score / questions.length) * 100) : 0}%</div><div className="text-xs text-muted-foreground">Accuracy</div></div>
              <div className="rounded-2xl bg-card border border-border p-4 shadow-card"><div className="font-display text-2xl font-bold text-secondary">{totalTime}s</div><div className="text-xs text-muted-foreground">Total Time</div></div>
            </div>
            <Button className="mt-8 gradient-primary text-primary-foreground shadow-glow" onClick={() => setStage("setup")}><RotateCcw className="mr-2 h-4 w-4" /> Try Again</Button>
          </motion.div>
        )}
      </div>
      <DesmosCalculator open={desmosOpen} onClose={() => setDesmosOpen(false)} />
    </Layout>
  );
};

export default Quiz;
