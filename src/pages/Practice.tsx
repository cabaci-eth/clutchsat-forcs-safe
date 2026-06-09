import { useEffect, useMemo, useState, useCallback } from "react";
import { CheckCircle, XCircle, BookOpen, Calculator, FileText, Loader2, Shuffle, ChevronDown, ChevronRight, Filter, CalculatorIcon, Search as SearchIcon, X, Layers, BarChart3, AlertTriangle, Bookmark } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DesmosCalculator from "@/components/DesmosCalculator";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { useAceContext } from "@/contexts/AceContext";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import PassageBlock from "@/components/PassageBlock";
import BookmarkButton from "@/components/BookmarkButton";
import MathText from "@/components/MathText";
import QuestionMedia from "@/components/QuestionMedia";
import { parseNumericInput, checkNumericAnswer, isValidGridInInput } from "@/lib/mathUtils";
import { SAT_HIERARCHY, MATH_SUBSECTIONS, ENGLISH_SUBSECTIONS, isEnglish, getSubSubsections } from "@/lib/satStructure";

const subjectIcons: Record<string, typeof BookOpen> = { Math: Calculator, English: BookOpen, Reading: BookOpen, Writing: FileText };

const difficultyColors: Record<string, string> = {
  Easy: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  Medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  Hard: "bg-destructive/10 text-destructive border-destructive/20",
};

const subjectBorderColors: Record<string, string> = {
  Math: "border-l-primary/40",
  English: "border-l-secondary/40",
  Reading: "border-l-secondary/40",
  Writing: "border-l-accent/40",
};

const ITEMS_PER_PAGE = 10;

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

const Practice = () => {
  const [subjectFilter, setSubjectFilter] = useState<"All" | "Math" | "English">("All");
  const [difficultyFilter, setDifficultyFilter] = useState<string[]>([]);
  const [subsectionFilter, setSubsectionFilter] = useState<string[]>([]);
  const [subSubsectionFilter, setSubSubsectionFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<"All" | "Solved" | "Unsolved" | "Saved">("All");
  const [mistakesFilter, setMistakesFilter] = useState<"none" | "all" | "never_corrected" | "later_corrected">("none");
  const [mistakesExpanded, setMistakesExpanded] = useState(true);
  const [shuffled, setShuffled] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ Math: true, English: true });
  const [expandedSubsections, setExpandedSubsections] = useState<Record<string, boolean>>({});
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [gridInInputs, setGridInInputs] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [desmosOpen, setDesmosOpen] = useState(false);
  const [shuffleAnimating, setShuffleAnimating] = useState(false);
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { setQuestionContext, clearQuestionContext } = useAceContext();

  // Set Ace context when a question is expanded
  useEffect(() => {
    if (!expandedQuestion) {
      clearQuestionContext();
      return;
    }
    const q = (questions as Question[]).find((q) => q.id === expandedQuestion);
    if (q) {
      setQuestionContext({
        questionText: q.question_text,
        options: q.options as string[],
        subject: q.subject,
        explanation: q.explanation,
        passage: q.passage || undefined,
      });
    }
    return () => clearQuestionContext();
  }, [expandedQuestion]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(searchTerm); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ["questions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("questions").select("*").order("created_at");
      if (error) throw error;
      return data.map((q) => ({ ...q, options: (Array.isArray(q.options) ? q.options : []) as string[] })) as Question[];
    },
  });

  const { data: userAnswerIds = [] } = useQuery({
    queryKey: ["user_answer_ids", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_answers").select("question_id").eq("user_id", user!.id);
      if (error) throw error;
      return [...new Set(data.map((a) => a.question_id))];
    },
  });

  const { data: savedIds = [] } = useQuery({
    queryKey: ["saved_question_ids", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("saved_questions").select("question_id").eq("user_id", user!.id);
      if (error) throw error;
      return data.map((s) => s.question_id);
    },
  });

  const { data: questionSummary = [] } = useQuery({
    queryKey: ["question_summary", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_question_summary").select("question_id, ever_correct, ever_incorrect").eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
  });

  const solvedSet = useMemo(() => new Set(userAnswerIds), [userAnswerIds]);
  const savedSet = useMemo(() => new Set(savedIds), [savedIds]);
  const mistakesMap = useMemo(() => {
    const map = new Map<string, { ever_correct: boolean; ever_incorrect: boolean }>();
    questionSummary.forEach((s) => map.set(s.question_id, { ever_correct: s.ever_correct, ever_incorrect: s.ever_incorrect }));
    return map;
  }, [questionSummary]);

  useEffect(() => {
    const subject = searchParams.get("subject");
    const subsection = searchParams.get("subsection");
    const subSubSection = searchParams.get("subSubSection");
    const mistakes = searchParams.get("mistakes");

    if (subject === "Math" || subject === "English") {
      setSubjectFilter(subject);
    }

    if (subsection) {
      setSubsectionFilter([subsection]);
      setExpandedSubsections((prev) => ({ ...prev, [subsection]: true }));
    }

    if (subSubSection) {
      setSubSubsectionFilter([subSubSection]);
    }

    if (mistakes === "all") {
      setMistakesFilter("all");
    }

    if (subject || subsection || subSubSection || mistakes) {
      setPage(1);
    }
  }, [searchParams]);

  const refreshAfterAnswer = (uid: string) => {
    void queryClient.invalidateQueries({ queryKey: ["user_answer_ids", uid] });
    void queryClient.invalidateQueries({ queryKey: ["question_summary", uid] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard", uid] });
    void queryClient.invalidateQueries({ queryKey: ["navbar_xp", uid] });

    void supabase.rpc("check_achievements", { p_user_id: uid }).then(() => {
      void queryClient.invalidateQueries({ queryKey: ["navbar_achievements", uid] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard", uid] });
    });
  };

  // Compute counts for the 3-level hierarchy
  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    let baseFiltered = questions;
    if (subjectFilter === "Math") baseFiltered = baseFiltered.filter((q) => q.subject === "Math");
    else if (subjectFilter === "English") baseFiltered = baseFiltered.filter((q) => isEnglish(q.subject));

    let statusFiltered = baseFiltered;
    if (statusFilter === "Solved") statusFiltered = statusFiltered.filter((q) => solvedSet.has(q.id));
    else if (statusFilter === "Unsolved") statusFiltered = statusFiltered.filter((q) => !solvedSet.has(q.id));
    else if (statusFilter === "Saved") statusFiltered = statusFiltered.filter((q) => savedSet.has(q.id));

    let diffFiltered = statusFiltered;
    if (difficultyFilter.length > 0) diffFiltered = diffFiltered.filter((q) => q.difficulty && difficultyFilter.includes(q.difficulty));

    ["Easy", "Medium", "Hard"].forEach((d) => {
      counts[d] = statusFiltered.filter((q) => q.difficulty === d).length;
    });

    for (const [subject, subsections] of Object.entries(SAT_HIERARCHY)) {
      if (subjectFilter !== "All" && subjectFilter !== subject) continue;
      for (const [subsection, subSubs] of Object.entries(subsections)) {
        counts[subsection] = diffFiltered.filter((q) => q.subsection === subsection).length;
        for (const ss of subSubs) {
          counts[ss] = diffFiltered.filter((q) => q.sub_subsection === ss).length;
        }
      }
    }
    return counts;
  }, [questions, subjectFilter, difficultyFilter, statusFilter, solvedSet, savedSet]);

  const mistakeCounts = useMemo(() => {
    let base = questions;
    if (subjectFilter === "Math") base = base.filter((q) => q.subject === "Math");
    else if (subjectFilter === "English") base = base.filter((q) => isEnglish(q.subject));
    if (difficultyFilter.length > 0) base = base.filter((q) => q.difficulty && difficultyFilter.includes(q.difficulty));
    if (subsectionFilter.length > 0) base = base.filter((q) => q.subsection && subsectionFilter.includes(q.subsection));
    if (subSubsectionFilter.length > 0) base = base.filter((q) => q.sub_subsection && subSubsectionFilter.includes(q.sub_subsection));
    if (statusFilter === "Solved") base = base.filter((q) => solvedSet.has(q.id));
    else if (statusFilter === "Unsolved") base = base.filter((q) => !solvedSet.has(q.id));
    else if (statusFilter === "Saved") base = base.filter((q) => savedSet.has(q.id));

    const allMistakes = base.filter((q) => mistakesMap.get(q.id)?.ever_incorrect).length;
    const neverCorrected = base.filter((q) => {
      const s = mistakesMap.get(q.id);
      return !!s?.ever_incorrect && !s.ever_correct;
    }).length;
    const laterCorrected = base.filter((q) => {
      const s = mistakesMap.get(q.id);
      return !!s?.ever_incorrect && !!s.ever_correct;
    }).length;

    return { allMistakes, neverCorrected, laterCorrected };
  }, [questions, subjectFilter, difficultyFilter, subsectionFilter, subSubsectionFilter, statusFilter, solvedSet, savedSet, mistakesMap]);

  const filtered = useMemo(() => {
    let result = questions;
    if (subjectFilter === "Math") result = result.filter((q) => q.subject === "Math");
    else if (subjectFilter === "English") result = result.filter((q) => isEnglish(q.subject));
    if (difficultyFilter.length > 0) result = result.filter((q) => q.difficulty && difficultyFilter.includes(q.difficulty));
    if (subsectionFilter.length > 0) result = result.filter((q) => q.subsection && subsectionFilter.includes(q.subsection));
    if (subSubsectionFilter.length > 0) result = result.filter((q) => q.sub_subsection && subSubsectionFilter.includes(q.sub_subsection));
    if (statusFilter === "Solved") result = result.filter((q) => solvedSet.has(q.id));
    else if (statusFilter === "Unsolved") result = result.filter((q) => !solvedSet.has(q.id));
    else if (statusFilter === "Saved") result = result.filter((q) => savedSet.has(q.id));

    if (mistakesFilter !== "none") {
      result = result.filter((q) => {
        const s = mistakesMap.get(q.id);
        if (!s || !s.ever_incorrect) return false;
        if (mistakesFilter === "all") return true;
        if (mistakesFilter === "never_corrected") return !s.ever_correct;
        if (mistakesFilter === "later_corrected") return s.ever_correct;
        return true;
      });
    }

    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      result = result.filter((q) =>
        q.question_text.toLowerCase().includes(lower) ||
        (q.passage && q.passage.toLowerCase().includes(lower))
      );
    }

    if (shuffled) {
      result = [...result].sort(() => Math.random() - 0.5);
    }
    return result;
  }, [questions, subjectFilter, difficultyFilter, subsectionFilter, subSubsectionFilter, statusFilter, mistakesFilter, shuffled, shuffleSeed, solvedSet, savedSet, mistakesMap, debouncedSearch]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paged = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleAnswer = async (qId: string, idx: number, correctAnswer: number) => {
    if (revealed[qId]) return;
    setAnswers((prev) => ({ ...prev, [qId]: idx }));
    setRevealed((prev) => ({ ...prev, [qId]: true }));
    if (user) {
      await supabase.from("user_answers").insert({
        user_id: user.id, question_id: qId, selected_answer: idx, is_correct: false,
      });
      refreshAfterAnswer(user.id);
    }
  };

  const handleGridInSubmit = async (q: Question) => {
    if (revealed[q.id]) return;
    const input = gridInInputs[q.id]?.trim();
    if (!input) return;
    const isCorrect = q.correct_answer_numeric !== null && checkNumericAnswer(input, q.correct_answer_numeric);
    setAnswers((prev) => ({ ...prev, [q.id]: input }));
    setRevealed((prev) => ({ ...prev, [q.id]: true }));
    if (user) {
      await supabase.from("user_answers").insert({
        user_id: user.id, question_id: q.id, selected_answer: isCorrect ? q.correct_answer : -1, is_correct: false,
      });
      refreshAfterAnswer(user.id);
    }
  };

  const toggleSubsection = (sub: string) => {
    setSubsectionFilter((prev) => prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]);
    setPage(1);
  };
  const toggleSubSubsection = (ss: string) => {
    setSubSubsectionFilter((prev) => prev.includes(ss) ? prev.filter((s) => s !== ss) : [...prev, ss]);
    setPage(1);
  };
  const toggleDifficulty = (d: string) => {
    setDifficultyFilter((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
    setPage(1);
  };
  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };
  const toggleSubsectionExpand = (sub: string) => {
    setExpandedSubsections((prev) => ({ ...prev, [sub]: !prev[sub] }));
  };

  const getPassageLabel = (subject: string) => isEnglish(subject) ? "Passage" : "Context";

  const handleShuffle = () => {
    setShuffleAnimating(true);
    setShuffled(true);
    setShuffleSeed((s) => s + 1);
    setPage(1);
    setTimeout(() => setShuffleAnimating(false), 500);
  };

  const renderSubjectHierarchy = (subject: "Math" | "English") => {
    const Icon = subject === "Math" ? Calculator : BookOpen;
    const subsections = SAT_HIERARCHY[subject];
    const subjectCount = Object.values(subsections).reduce((sum, subs) => {
      return sum + subs.reduce((s, ss) => s + (filterCounts[ss] || 0), 0);
    }, 0);

    return (
      <div className="mb-2" key={subject}>
        <button onClick={() => toggleSection(subject)} className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors w-full text-left py-1.5 rounded-lg hover:bg-muted/50 px-1 -mx-1">
          <motion.div animate={{ rotate: expandedSections[subject] ? 90 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </motion.div>
          <Icon className="h-3.5 w-3.5 text-primary" /> 
          <span className="flex-1">{subject}</span>
          <span className="text-[11px] text-muted-foreground tabular-nums bg-muted rounded-full px-2 py-0.5">{subjectCount}</span>
        </button>
        <AnimatePresence>
          {expandedSections[subject] && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="ml-3 mt-1 space-y-0.5 border-l border-border pl-3">
                {Object.entries(subsections).map(([subsection, subSubs]) => (
                  <div key={subsection}>
                    <div className="flex items-center gap-1.5 py-1">
                      <Checkbox checked={subsectionFilter.includes(subsection)} onCheckedChange={() => toggleSubsection(subsection)} className="h-3.5 w-3.5" />
                      <button onClick={() => toggleSubsectionExpand(subsection)} className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground cursor-pointer flex-1 min-w-0 text-left transition-colors rounded px-1 -mx-1 hover:bg-muted/50">
                        {subSubs.length > 0 && (
                          <motion.div animate={{ rotate: expandedSubsections[subsection] ? 90 : 0 }} transition={{ duration: 0.15 }}>
                            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                          </motion.div>
                        )}
                        <span className="truncate flex-1">{subsection}</span>
                      </button>
                      <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{filterCounts[subsection] || 0}</span>
                    </div>
                    <AnimatePresence>
                      {expandedSubsections[subsection] && subSubs.length > 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden"
                        >
                          <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border/50 pl-3">
                            {subSubs.map((ss) => (
                              <label key={ss} className="flex items-center gap-1.5 text-xs cursor-pointer py-0.5 rounded px-1 -mx-1 hover:bg-muted/50 transition-colors">
                                <Checkbox checked={subSubsectionFilter.includes(ss)} onCheckedChange={() => toggleSubSubsection(ss)} className="h-3 w-3" />
                                <span className="text-muted-foreground hover:text-foreground transition-colors flex-1 truncate">{ss}</span>
                                <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{filterCounts[ss] || 0}</span>
                              </label>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const filterSidebar = (
    <div className="space-y-5">
      {/* Subject */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5" /> Subject
        </h3>
        <div className="flex gap-1.5">
          {(["All", "Math", "English"] as const).map((s) => (
            <button
              key={s}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                subjectFilter === s
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              onClick={() => { setSubjectFilter(s); setSubsectionFilter([]); setSubSubsectionFilter([]); setPage(1); }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          <BarChart3 className="h-3.5 w-3.5" /> Difficulty
        </h3>
        <div className="space-y-1.5">
          {["Easy", "Medium", "Hard"].map((d) => (
            <label key={d} className="flex items-center gap-2 text-sm cursor-pointer py-0.5 rounded-lg px-1.5 -mx-1.5 hover:bg-muted/50 transition-colors">
              <Checkbox checked={difficultyFilter.includes(d)} onCheckedChange={() => toggleDifficulty(d)} className="h-3.5 w-3.5" />
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border ${difficultyColors[d]}`}>{d}</span>
              <span className="text-[11px] text-muted-foreground tabular-nums ml-auto">{filterCounts[d] || 0}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Status */}
      {user && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5" /> Status
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {(["All", "Solved", "Unsolved", "Saved"] as const).map((s) => (
              <button
                key={s}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                  statusFilter === s
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                onClick={() => { setStatusFilter(s); setPage(1); }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mistakes */}
      {user && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Mistakes
          </h3>
          <div className="space-y-1.5">
            <div className="flex cursor-pointer items-center gap-2 text-sm rounded-lg px-1.5 -mx-1.5 hover:bg-muted/50 transition-colors">
              <Checkbox
                checked={mistakesFilter === "all"}
                className="h-3.5 w-3.5"
                ref={(el) => {
                  if (el) {
                    const isIndeterminate = mistakesFilter === "never_corrected" || mistakesFilter === "later_corrected";
                    (el as unknown as HTMLButtonElement).dataset.state = isIndeterminate ? "indeterminate" : mistakesFilter === "all" ? "checked" : "unchecked";
                  }
                }}
                onCheckedChange={(checked) => {
                  setMistakesFilter(checked ? "all" : "none");
                  setPage(1);
                }}
              />
              <span className="text-muted-foreground text-[13px] flex-1" onClick={() => { setMistakesFilter(mistakesFilter === "all" ? "none" : "all"); setPage(1); }}>All Mistakes</span>
              <span className="text-[10px] text-muted-foreground tabular-nums">{mistakeCounts.allMistakes}</span>
              <button onClick={() => setMistakesExpanded(!mistakesExpanded)} className="p-0.5 hover:bg-muted rounded">
                <motion.div animate={{ rotate: mistakesExpanded ? 90 : 0 }} transition={{ duration: 0.15 }}>
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                </motion.div>
              </button>
            </div>

            <AnimatePresence>
              {mistakesExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <div className="ml-5 space-y-1.5 border-l border-border/50 pl-3">
                    <label className="flex cursor-pointer items-center gap-2 text-[13px] rounded px-1 -mx-1 hover:bg-muted/50 transition-colors">
                      <Checkbox
                        className="h-3.5 w-3.5"
                        checked={mistakesFilter === "never_corrected" || mistakesFilter === "all"}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            if (mistakesFilter === "later_corrected") setMistakesFilter("all");
                            else setMistakesFilter("never_corrected");
                          } else {
                            if (mistakesFilter === "all") setMistakesFilter("later_corrected");
                            else setMistakesFilter("none");
                          }
                          setPage(1);
                        }}
                      />
                      <span className="text-muted-foreground flex-1">Never corrected</span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">{mistakeCounts.neverCorrected}</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-[13px] rounded px-1 -mx-1 hover:bg-muted/50 transition-colors">
                      <Checkbox
                        className="h-3.5 w-3.5"
                        checked={mistakesFilter === "later_corrected" || mistakesFilter === "all"}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            if (mistakesFilter === "never_corrected") setMistakesFilter("all");
                            else setMistakesFilter("later_corrected");
                          } else {
                            if (mistakesFilter === "all") setMistakesFilter("never_corrected");
                            else setMistakesFilter("none");
                          }
                          setPage(1);
                        }}
                      />
                      <span className="text-muted-foreground flex-1">Later corrected</span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">{mistakeCounts.laterCorrected}</span>
                    </label>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Categories */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          <Bookmark className="h-3.5 w-3.5" /> Categories
        </h3>
        {(subjectFilter === "All" || subjectFilter === "Math") && renderSubjectHierarchy("Math")}
        {(subjectFilter === "All" || subjectFilter === "English") && renderSubjectHierarchy("English")}
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">Question Bank</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {filtered.length} question{filtered.length !== 1 ? "s" : ""} found
              {!user && " — Sign in to track solved questions."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <motion.div animate={shuffleAnimating ? { rotate: 360 } : {}} transition={{ duration: 0.4 }}>
              <Button size="sm" variant="outline" onClick={handleShuffle} className="gap-1.5">
                <Shuffle className="h-3.5 w-3.5" /> Shuffle
              </Button>
            </motion.div>
            <Button size="sm" variant="outline" onClick={() => setDesmosOpen(true)} className="gap-1.5">
              <CalculatorIcon className="h-3.5 w-3.5" /> Desmos
            </Button>
            {isMobile && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5"><Filter className="h-3.5 w-3.5" /> Filters</Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 overflow-y-auto pt-8">
                  <h2 className="font-display text-lg font-semibold text-foreground mb-5">Filters</h2>
                  {filterSidebar}
                </SheetContent>
              </Sheet>
            )}
          </div>
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          {!isMobile && (
            <div className="w-72 shrink-0">
              <div className="sticky top-20 rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-4 shadow-sm max-h-[calc(100vh-6rem)] overflow-y-auto">
                {filterSidebar}
              </div>
            </div>
          )}

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Search bar */}
            <div className="relative mb-4">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
              <input
                type="text"
                placeholder="Search questions or passages…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-border bg-card/60 backdrop-blur-sm pl-9 pr-9 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40 transition-all"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <Skeleton className="h-6 w-16 rounded-full" />
                      <Skeleton className="h-5 w-14 rounded-full" />
                    </div>
                    <Skeleton className="h-5 w-full mb-2" />
                    <Skeleton className="h-5 w-3/4 mb-4" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[...Array(4)].map((_, j) => (
                        <Skeleton key={j} className="h-11 rounded-xl" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : paged.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 text-muted-foreground rounded-2xl border border-border bg-card/50 backdrop-blur-sm">
                <SearchIcon className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="font-medium">No questions match your filters</p>
                <p className="text-sm mt-1">Try adjusting your filters or search terms</p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {paged.map((q, i) => {
                  const Icon = subjectIcons[q.subject] || BookOpen;
                  const isAnswered = revealed[q.id];
                  const isExpanded = expandedQuestion === q.id;
                  const isSolved = solvedSet.has(q.id);
                  const isGridIn = q.question_type === "grid-in";
                  const borderColor = subjectBorderColors[q.subject] || "border-l-primary";

                  return (
                    <motion.div
                      key={q.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.3 }}
                      className={`group rounded-xl border border-border bg-card shadow-sm overflow-hidden border-l-2 ${borderColor} border-l-opacity-40 hover:shadow-md hover:border-border/80 transition-all duration-200`}
                    >
                      <div
                        onClick={() => setExpandedQuestion(isExpanded ? null : q.id)}
                        className="w-full text-left p-4 flex items-start gap-3 hover:bg-muted/20 transition-colors cursor-pointer"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                              <Icon className="h-3 w-3" /> {q.subject}
                            </span>
                            {q.difficulty && (
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border ${difficultyColors[q.difficulty]}`}>
                                {q.difficulty}
                              </span>
                            )}
                            {q.subsection && <span className="text-[11px] text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5">{q.subsection}</span>}
                            {q.sub_subsection && <span className="text-[11px] text-muted-foreground/70">› {q.sub_subsection}</span>}
                            {isGridIn && <span className="text-[11px] rounded-full bg-secondary/10 px-2 py-0.5 text-secondary font-medium border border-secondary/20">Grid-In</span>}
                            {isSolved && user && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                <CheckCircle className="h-3 w-3" /> Solved
                              </span>
                            )}
                          </div>
                          <p className="text-foreground font-medium text-sm line-clamp-2 leading-relaxed">
                            <MathText text={q.question_text} />
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 mt-1">
                          <div onClick={(e) => e.stopPropagation()}>
                            <BookmarkButton questionId={q.id} isSaved={savedSet.has(q.id)} />
                          </div>
                          <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </motion.div>
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                            <div className="px-4 pb-4 border-t border-border/50 pt-4">
                              {q.passage && <PassageBlock passage={q.passage} label={getPassageLabel(q.subject)} />}
                              <QuestionMedia questionId={q.id} />

                              <p className="text-foreground font-medium mb-4 leading-relaxed">
                                <MathText text={q.question_text} />
                              </p>

                              {isGridIn ? (
                                <div className="space-y-3">
                                  <div className="flex gap-2">
                                    <Input
                                      type="text"
                                      inputMode="decimal"
                                      placeholder="Enter answer (e.g. 3/4, 1.5, 2 1/3)..."
                                      value={gridInInputs[q.id] || ""}
                                      onChange={(e) => {
                                        if (isValidGridInInput(e.target.value) || e.target.value === "") {
                                          setGridInInputs((prev) => ({ ...prev, [q.id]: e.target.value }));
                                        }
                                      }}
                                      disabled={isAnswered}
                                      className="max-w-xs rounded-xl"
                                    />
                                    {!isAnswered && (
                                      <Button onClick={() => handleGridInSubmit(q)} disabled={!gridInInputs[q.id]?.trim()} className="rounded-xl">
                                        Submit
                                      </Button>
                                    )}
                                  </div>
                                  {isAnswered && (
                                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className={`rounded-xl p-3 text-sm border ${
                                      q.correct_answer_numeric !== null && checkNumericAnswer(answers[q.id] as string, q.correct_answer_numeric)
                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                        : "bg-destructive/10 text-destructive border-destructive/20"
                                    }`}>
                                      Your answer: {answers[q.id]} | Correct: {q.correct_answer_numeric}
                                    </motion.div>
                                  )}
                                </div>
                              ) : q.options.length > 0 ? (
                                <div className="grid gap-2 sm:grid-cols-2">
                                  {q.options.map((opt, idx) => {
                                    let optClass = "border border-border bg-card hover:bg-muted/40 hover:border-primary/20 text-foreground";
                                    if (isAnswered) {
                                      if (idx === q.correct_answer) optClass = "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
                                      else if (idx === answers[q.id]) optClass = "border-destructive/30 bg-destructive/10 text-destructive";
                                      else optClass = "border border-border bg-card text-muted-foreground opacity-50";
                                    }
                                    return (
                                      <button key={idx} onClick={() => handleAnswer(q.id, idx, q.correct_answer)} disabled={isAnswered} className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 text-left ${optClass}`}>
                                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current/20 text-[11px] font-bold">
                                          {String.fromCharCode(65 + idx)}
                                        </span>
                                        {isAnswered && idx === q.correct_answer && <CheckCircle className="h-4 w-4 shrink-0" />}
                                        {isAnswered && idx === answers[q.id] && idx !== q.correct_answer && <XCircle className="h-4 w-4 shrink-0" />}
                                        <span className="flex-1"><MathText text={opt} /></span>
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-muted-foreground text-sm italic">No options available for this question.</p>
                              )}

                              {isAnswered && (
                                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-4 rounded-xl bg-muted/50 border border-border/50 p-4 text-sm text-muted-foreground">
                                  <strong className="text-foreground">Explanation:</strong> <MathText text={q.explanation} />
                                </motion.div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex flex-col items-center gap-3">
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded-full px-3 text-xs"
                  >
                    Prev
                  </Button>
                  {(() => {
                    const maxVisible = typeof window !== 'undefined' && window.innerWidth < 640 ? 5 : 7;
                    return Array.from({ length: Math.min(totalPages, maxVisible) }, (_, i) => {
                      let pageNum: number;
                      const half = Math.floor(maxVisible / 2);
                      if (totalPages <= maxVisible) {
                        pageNum = i + 1;
                      } else if (page <= half + 1) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - half) {
                        pageNum = totalPages - maxVisible + 1 + i;
                      } else {
                        pageNum = page - half + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`h-8 w-8 rounded-full text-xs font-medium transition-all duration-200 ${
                            page === pageNum
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    });
                  })()}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-full px-3 text-xs"
                  >
                    Next
                  </Button>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const input = (e.currentTarget.elements.namedItem("goToPage") as HTMLInputElement);
                    const val = parseInt(input.value, 10);
                    if (val >= 1 && val <= totalPages) {
                      setPage(val);
                      input.value = "";
                    }
                  }}
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  <span>Go to</span>
                  <input
                    name="goToPage"
                    type="number"
                    min={1}
                    max={totalPages}
                    placeholder={`1–${totalPages}`}
                    className="h-7 w-16 rounded-lg border border-border bg-card text-center text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <Button type="submit" size="sm" variant="ghost" className="h-7 px-2 text-xs rounded-lg">
                    Go
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
      <DesmosCalculator open={desmosOpen} onClose={() => setDesmosOpen(false)} />
    </Layout>
  );
};

export default Practice;
