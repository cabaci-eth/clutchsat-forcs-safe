import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ArrowLeft, Trash2, Eye, Clock, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import MathText from "@/components/MathText";
import { getMockTestAnswers } from "@/hooks/useMockTests";

interface Attempt {
  id: string;
  test_id: string;
  mode: string;
  total_score: number | null;
  section_scores: any;
  answers: any;
  completed_at: string | null;
  created_at: string;
  started_at: string;
  time_spent: any;
  mock_tests?: { title: string } | null;
}

interface Question {
  id: string;
  question_text: string;
  options: any;
  correct_answer?: number;
  explanation?: string;
  module_name: string;
  module_order: number;
  question_order: number;
  passage?: string | null;
  image_url?: string | null;
}

interface Props {
  attempts: Attempt[];
  questions: Question[];
  testTitle: string;
  testId: string;
  open: boolean;
  onClose: () => void;
  onDelete: (attemptId: string) => Promise<void>;
  onResume: (attemptId: string, mode: string) => void;
}

const AttemptDetailsModal = ({ attempts, questions, testTitle, testId, open, onClose, onDelete, onResume }: Props) => {
  const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [answerData, setAnswerData] = useState<Record<string, { correct_answer: number; explanation: string }> | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Load answer data when a completed attempt is selected for report
  useEffect(() => {
    if (selectedAttempt?.completed_at && testId) {
      getMockTestAnswers(testId).then(data => setAnswerData(data)).catch(console.error);
    }
  }, [selectedAttempt, testId]);

  const toggleModule = (key: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await onDelete(deleteId);
    if (selectedAttempt?.id === deleteId) setSelectedAttempt(null);
    setDeleteId(null);
  };

  // Group questions by module
  const moduleGroups = questions.reduce<Record<string, Question[]>>((acc, q) => {
    const key = `${q.module_name} M${q.module_order}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(q);
    return acc;
  }, {});

  // Report view for a completed attempt
  const renderReport = (attempt: Attempt) => {
    const savedAnswers = (attempt.answers ?? {}) as Record<string, any>;

    return (
      <div className="space-y-4">
        <button onClick={() => setSelectedAttempt(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to attempts
        </button>

        {/* Score summary */}
        {attempt.total_score && (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-2xl font-bold text-foreground">{attempt.total_score}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 text-center">
              <p className="text-xs text-muted-foreground">R&W</p>
              <p className="text-xl font-bold text-foreground">{(attempt.section_scores as any)?.rw ?? "–"}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 text-center">
              <p className="text-xs text-muted-foreground">Math</p>
              <p className="text-xl font-bold text-foreground">{(attempt.section_scores as any)?.math ?? "–"}</p>
            </div>
          </div>
        )}

        {!answerData ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Loading answers...</div>
        ) : (
        <>
        {/* Questions by module */}
        {Object.entries(moduleGroups).map(([modKey, modQuestions]) => {
          const isExpanded = expandedModules.has(modKey);
          const modCorrect = modQuestions.filter(q => {
            const a = savedAnswers[q.id];
            if (!a) return false;
            const sel = typeof a === "object" ? a.selected : a;
            const correctAns = answerData[q.id]?.correct_answer;
            return sel === correctAns;
          }).length;

          return (
            <div key={modKey} className="rounded-xl border border-border bg-card overflow-hidden">
              <button
                onClick={() => toggleModule(modKey)}
                className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{modKey}</span>
                  <Badge variant="outline" className="text-xs">{modCorrect}/{modQuestions.length}</Badge>
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>
              {isExpanded && (
                <div className="border-t border-border divide-y divide-border">
                  {modQuestions.sort((a, b) => a.question_order - b.question_order).map((q) => {
                    const a = savedAnswers[q.id];
                    const selected = a ? (typeof a === "object" ? a.selected : a) : null;
                    const qAnswer = answerData[q.id];
                    const correctAns = qAnswer?.correct_answer;
                    const isCorrect = selected === correctAns;
                    const opts = q.options as string[];

                    return (
                      <div key={q.id} className="p-3 space-y-2">
                        <div className="flex items-start gap-2">
                          {isCorrect ? (
                            <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                          ) : selected !== null && selected !== undefined ? (
                            <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border border-muted-foreground/30 shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground mb-1">Q{q.question_order}</p>
                            <div className="text-sm text-foreground">
                              <MathText text={q.question_text} />
                            </div>
                          </div>
                        </div>

                        {/* Options */}
                        <div className="ml-6 space-y-1">
                          {opts.map((opt, idx) => {
                            const isSelectedOpt = selected === idx;
                            const isCorrectOpt = idx === correctAns;
                            let cls = "text-muted-foreground";
                            if (isCorrectOpt) cls = "text-success font-medium";
                            else if (isSelectedOpt && !isCorrectOpt) cls = "text-destructive line-through";

                            return (
                              <div key={idx} className={`text-xs flex items-start gap-1.5 ${cls}`}>
                                <span className="font-semibold shrink-0">{String.fromCharCode(65 + idx)}.</span>
                                <MathText text={opt} />
                                {isSelectedOpt && !isCorrectOpt && <span className="text-[10px]">(your answer)</span>}
                                {isCorrectOpt && <span className="text-[10px]">✓</span>}
                              </div>
                            );
                          })}
                        </div>

                        {/* Explanation */}
                        {qAnswer?.explanation && (
                          <div className="ml-6 rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">
                            <MathText text={qAnswer.explanation} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        </>
        )}
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-2xl max-h-[85vh] p-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4 pb-2 sm:px-6 sm:pt-6">
            <DialogTitle className="font-display text-lg">{testTitle} — Attempts</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 px-4 pb-4 sm:px-6 sm:pb-6" style={{ maxHeight: "calc(85vh - 80px)" }}>
            {selectedAttempt ? renderReport(selectedAttempt) : (
              <div className="space-y-2">
                {attempts.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">No attempts yet.</p>
                ) : (
                  attempts.map((a) => {
                    const isDraft = !a.completed_at;
                    const scores = a.section_scores as any;
                    return (
                      <div
                        key={a.id}
                        className="rounded-xl border border-border bg-card p-3 sm:p-4 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant={a.mode === "simulation" ? "default" : "outline"} className="text-[10px] shrink-0">
                                {a.mode === "simulation" ? "Simulation" : "Practice"}
                              </Badge>
                              {isDraft && (
                                <Badge variant="secondary" className="text-[10px] shrink-0">In Progress</Badge>
                              )}
                              {a.total_score && (
                                <span className="text-sm font-bold text-foreground">{a.total_score}/1600</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                              <span>{format(new Date(a.created_at), "MMM d, yyyy h:mm a")}</span>
                              {scores?.rw && <span>R&W: {scores.rw}</span>}
                              {scores?.math && <span>Math: {scores.math}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {isDraft ? (
                            <Button size="sm" variant="outline" onClick={() => onResume(a.id, a.mode)} className="text-xs h-7">
                              Resume
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => { setSelectedAttempt(a); setExpandedModules(new Set()); }} className="text-xs h-7">
                              <Eye className="mr-1 h-3 w-3" /> Full Report
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => setDeleteId(a.id)} className="text-xs h-7 text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this attempt?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AttemptDetailsModal;
