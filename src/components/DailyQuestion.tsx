import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CalendarDays, CheckCircle2, XCircle, Loader2, Send, Calculator } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import MathText from "./MathText";
import PassageBlock from "./PassageBlock";
import QuestionMedia from "./QuestionMedia";
import DesmosCalculator from "./DesmosCalculator";
import { checkNumericAnswer, isValidGridInInput } from "@/lib/mathUtils";

const TODAY_KEY = () => new Date().toISOString().slice(0, 10);

function getDailyLocalKey(subject: string) {
  return `clutchsat_daily_${subject}_${TODAY_KEY()}`;
}

interface DailyQuestionCardProps {
  subject: "Math" | "English";
}

function DailyQuestionCard({ subject }: DailyQuestionCardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<number | null>(null);
  const [gridInValue, setGridInValue] = useState("");
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [guestAnswered, setGuestAnswered] = useState(false);
  const [desmosOpen, setDesmosOpen] = useState(false);

  // Check guest localStorage
  useEffect(() => {
    if (!user) {
      const stored = localStorage.getItem(getDailyLocalKey(subject));
      if (stored) {
        setGuestAnswered(true);
        try {
          const parsed = JSON.parse(stored);
          setIsCorrect(parsed.correct);
          if (parsed.idx !== undefined) setSelected(parsed.idx);
        } catch {}
      }
    }
  }, [user, subject]);

  // Pick a deterministic question based on today's date
  const { data: question, isLoading } = useQuery({
    queryKey: ["daily_question", subject, TODAY_KEY()],
    queryFn: async () => {
      const dateStr = TODAY_KEY();
      const seed = dateStr.split("-").reduce((a, b) => a + parseInt(b), 0);
      const seedOffset = subject === "English" ? seed + 7919 : seed;

      const dbSubject = subject === "English" ? "English" : "Math";
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("subject", dbSubject)
        .in("difficulty", ["Hard", "Medium"])
        .limit(50);

      if (error || !data?.length) return null;
      return data[seedOffset % data.length];
    },
    staleTime: 1000 * 60 * 60,
  });

  // Check if already answered today (logged-in users)
  const { data: alreadyAnswered } = useQuery({
    queryKey: ["daily_answered", user?.id, question?.id, TODAY_KEY()],
    enabled: !!user && !!question,
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_answers")
        .select("id, answer_correct")
        .eq("user_id", user!.id)
        .eq("question_id", question!.id)
        .eq("answered_at", TODAY_KEY())
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (alreadyAnswered) {
      setAnswered(true);
      setIsCorrect(alreadyAnswered.answer_correct);
    }
  }, [alreadyAnswered]);

  const submitMutation = useMutation({
    mutationFn: async ({ answerIdx, correct }: { answerIdx: number; correct: boolean }) => {
      if (!user || !question) return;
      await supabase.from("daily_answers").insert({
        user_id: user.id,
        question_id: question.id,
        answer_correct: correct,
        answered_at: TODAY_KEY(),
      });
      await supabase.from("user_answers").insert({
        user_id: user.id,
        question_id: question.id,
        selected_answer: answerIdx,
        is_correct: correct,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["navbar_xp"] });
      queryClient.invalidateQueries({ queryKey: ["daily_answered"] });
    },
  });

  const handleAnswer = (idx: number) => {
    if (answered || guestAnswered || !question) return;
    setSelected(idx);
    const correct = idx === question.correct_answer;
    setIsCorrect(correct);
    setAnswered(true);

    if (user) {
      submitMutation.mutate({ answerIdx: idx, correct });
    } else {
      localStorage.setItem(getDailyLocalKey(subject), JSON.stringify({ idx, correct }));
      setGuestAnswered(true);
    }

    toast(correct ? "✅ Correct!" : "❌ Incorrect", {
      description: correct
        ? `+10 XP for the daily ${subject} question!`
        : `+5 XP — keep going!`,
    });
  };

  const handleGridInSubmit = () => {
    if (answered || guestAnswered || !question || !gridInValue.trim()) return;

    const correctNumeric = question.correct_answer_numeric;
    if (correctNumeric == null) return;

    const correct = checkNumericAnswer(gridInValue, correctNumeric);
    setIsCorrect(correct);
    setAnswered(true);

    if (user) {
      submitMutation.mutate({ answerIdx: -1, correct });
    } else {
      localStorage.setItem(getDailyLocalKey(subject), JSON.stringify({ gridIn: gridInValue, correct }));
      setGuestAnswered(true);
    }

    toast(correct ? "✅ Correct!" : "❌ Incorrect", {
      description: correct
        ? `+10 XP for the daily ${subject} question!`
        : `+5 XP — keep going!`,
    });
  };

  if (isLoading) {
    return (
      <Card className="border-border bg-card shadow-card">
        <CardContent className="p-6 flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!question) return null;

  const isGridIn = question.question_type === "grid-in";
  const options = (question.options as string[]) ?? [];
  const done = answered || guestAnswered;

  return (
    <>
      <Card className="border-border bg-card shadow-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Daily {subject} Question
            </CardTitle>
            <div className="flex items-center gap-2">
              {subject === "Math" && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => setDesmosOpen(true)}
                  title="Open Desmos Calculator"
                >
                  <Calculator className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
              <Badge variant="secondary" className="text-xs">
                {question.difficulty}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <QuestionMedia questionId={question.id} />
          {question.passage && <PassageBlock passage={question.passage} />}
          <div className="text-sm text-foreground">
            <MathText text={question.question_text} />
          </div>

          {isGridIn ? (
            <div className="space-y-2">
              {!done ? (
                <div className="flex gap-2">
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="Enter your answer (e.g. 3, 1/2, 2.5)"
                    value={gridInValue}
                    onChange={(e) => {
                      if (isValidGridInInput(e.target.value)) {
                        setGridInValue(e.target.value);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleGridInSubmit();
                    }}
                    className="flex-1"
                  />
                  <Button size="sm" onClick={handleGridInSubmit} disabled={!gridInValue.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className={cn(
                  "rounded-lg border px-4 py-3 text-sm",
                  isCorrect ? "border-green-500 bg-green-500/10" : "border-destructive bg-destructive/10"
                )}>
                  <div className="flex items-center gap-2">
                    {isCorrect ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> : <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                    <span>
                      {gridInValue ? `Your answer: ${gridInValue}` : "Answered"}
                      {!isCorrect && question.correct_answer_numeric != null && (
                        <span className="ml-2 text-muted-foreground">(Correct: {question.correct_answer_numeric})</span>
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {options.map((opt: string, idx: number) => {
                const isSelected = selected === idx || (alreadyAnswered && idx === question.correct_answer);
                const isRight = idx === question.correct_answer;
                return (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(idx)}
                    disabled={done}
                    className={cn(
                      "w-full text-left rounded-lg border px-4 py-3 text-sm transition-colors min-h-[44px]",
                      done && isRight ? "border-green-500 bg-green-500/10 text-foreground"
                        : done && isSelected && !isRight ? "border-destructive bg-destructive/10 text-foreground"
                        : "border-border bg-background hover:bg-muted text-foreground"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-medium text-muted-foreground">{String.fromCharCode(65 + idx)}.</span>
                      <MathText text={opt} />
                      {done && isRight && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto shrink-0" />}
                      {done && isSelected && !isRight && <XCircle className="h-4 w-4 text-destructive ml-auto shrink-0" />}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {done && question.explanation && (
            <div className="rounded-lg bg-muted/50 border border-border p-3 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Explanation: </span>
              <MathText text={question.explanation} />
            </div>
          )}

          {done && (
            <p className="text-xs text-muted-foreground text-center">
              {isCorrect ? "🎉 Great job!" : "Keep practicing — you'll get it next time!"}
              {user ? ` (+${isCorrect ? 10 : 5} XP)` : " Sign in to earn XP!"}
            </p>
          )}
        </CardContent>
      </Card>

      {subject === "Math" && <DesmosCalculator open={desmosOpen} onClose={() => setDesmosOpen(false)} />}
    </>
  );
}

export default function DailyQuestion() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <DailyQuestionCard subject="English" />
      <DailyQuestionCard subject="Math" />
    </div>
  );
}
