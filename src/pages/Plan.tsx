import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import CountdownCard from "@/components/plan/CountdownCard";
import PlanSetupForm from "@/components/plan/PlanSetupForm";
import PlanDisplay from "@/components/plan/PlanDisplay";
import PlanCalendar from "@/components/plan/PlanCalendar";
import WeakAreasCard from "@/components/plan/WeakAreasCard";
import { generateStudyPlan, type GeneratedPlan, type WeakArea } from "@/lib/planGenerator";
import { cn } from "@/lib/utils";

const Plan = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [completions, setCompletions] = useState<Record<string, boolean>>({});
  const [testDate, setTestDate] = useState<Date | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [weakAreas, setWeakAreas] = useState<WeakArea[]>([]);
  const [planView, setPlanView] = useState<"weekly" | "calendar">("weekly");

  const toLocalISODate = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const fetchWeakAreas = useCallback(async (): Promise<WeakArea[]> => {
    if (!user) return [];
    try {
      const { data: answers } = await supabase
        .from("user_answers")
        .select("question_id, is_correct, questions!inner(subject, subsection, sub_subsection)")
        .eq("user_id", user.id);

      if (!answers || answers.length === 0) return [];

      const stats: Record<string, { correct: number; total: number; subject: string; subsection: string }> = {};
      for (const a of answers) {
        const q = a.questions as any;
        if (!q?.subsection) continue;
        const key = `${q.subject}|${q.subsection}`;
        if (!stats[key]) stats[key] = { correct: 0, total: 0, subject: q.subject, subsection: q.subsection };
        stats[key].total++;
        if (a.is_correct) stats[key].correct++;
      }

      return Object.values(stats)
        .map((s) => ({ subject: s.subject, subsection: s.subsection, accuracy: s.total > 0 ? s.correct / s.total : 0, totalAttempted: s.total }))
        .filter((a) => a.accuracy < 0.6 && a.totalAttempted >= 3)
        .sort((a, b) => a.accuracy - b.accuracy);
    } catch {
      return [];
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    const loadExisting = async () => {
      if (!user) { setLoadingExisting(false); return; }
      try {
        const { data } = await supabase.from("study_plans").select("*").eq("user_id", user.id)
          .gte("test_date", toLocalISODate(new Date())).order("created_at", { ascending: false }).limit(1).single();
        if (data) {
          setPlanId(data.id);
          setPlan(data.plan_json as any as GeneratedPlan);
          setCompletions((data as any).completions || {});
          setTestDate(new Date(data.test_date));
        }
      } catch {}
      setLoadingExisting(false);
    };
    loadExisting();
  }, [user, authLoading]);

  const handleGenerate = async (date: Date, hoursPerWeek: number, targetScore?: number, dailyHours?: Record<string, number>) => {
    setLoading(true);
    const areas = await fetchWeakAreas();
    setWeakAreas(areas);
    const generated = generateStudyPlan({ testDate: date, hoursPerWeek, targetScore, weakAreas: areas, dailyHours });
    setPlan(generated);
    setTestDate(date);
    setCompletions({});

    if (user) {
      const planData = {
        user_id: user.id, test_date: toLocalISODate(date), weekly_hours: hoursPerWeek,
        target_score: targetScore || null, plan_json: generated as any, completions: {} as any,
      };
      if (planId) {
        const { error } = await supabase.from("study_plans").update(planData).eq("id", planId);
        if (error) toast({ title: "Error saving plan", description: error.message, variant: "destructive" });
        else toast({ title: "Plan updated!", description: "Your new study plan has been saved." });
      } else {
        const { data, error } = await supabase.from("study_plans").insert(planData).select("id").single();
        if (error) toast({ title: "Error saving plan", description: error.message, variant: "destructive" });
        else { setPlanId(data.id); toast({ title: "Plan created!", description: "Your personalized study plan has been saved." }); }
      }
    }
    setLoading(false);
  };

  const handleToggleTask = async (taskId: string) => {
    const newCompletions = { ...completions, [taskId]: !completions[taskId] };
    if (!newCompletions[taskId]) delete newCompletions[taskId];
    setCompletions(newCompletions);
    if (user && planId) {
      await supabase.from("study_plans").update({ completions: newCompletions as any }).eq("id", planId);
    }
  };

  const handleReset = async () => {
    setCompletions({});
    if (user && planId) {
      await supabase.from("study_plans").update({ completions: {} as any }).eq("id", planId);
    }
    toast({ title: "Progress reset", description: "All task completions have been cleared." });
  };

  // Add custom task to a specific day
  const handleAddCustomTask = async (dayDate: string, description: string) => {
    if (!plan) return;
    const taskId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newTask = {
      id: taskId, type: "practice" as const, description, subject: "Mixed",
      minutes: 0, isWeakArea: false, isCustom: true,
    };

    // Deep clone and add task
    const updatedPlan = JSON.parse(JSON.stringify(plan)) as GeneratedPlan;
    for (const week of updatedPlan.weeks) {
      for (const day of week.days) {
        if (day.date === dayDate) {
          day.tasks.push(newTask as any);
          break;
        }
      }
    }
    setPlan(updatedPlan);

    if (user && planId) {
      await supabase.from("study_plans").update({ plan_json: updatedPlan as any }).eq("id", planId);
    }
    toast({ title: "Task added", description: `Custom task added for ${dayDate}.` });
  };

  // Delete custom task
  const handleDeleteCustomTask = async (taskId: string) => {
    if (!plan) return;
    const updatedPlan = JSON.parse(JSON.stringify(plan)) as GeneratedPlan;
    for (const week of updatedPlan.weeks) {
      for (const day of week.days) {
        day.tasks = day.tasks.filter((t: any) => t.id !== taskId);
      }
    }
    setPlan(updatedPlan);

    // Also remove from completions
    const newCompletions = { ...completions };
    delete newCompletions[taskId];
    setCompletions(newCompletions);

    if (user && planId) {
      await supabase.from("study_plans").update({ plan_json: updatedPlan as any, completions: newCompletions as any }).eq("id", planId);
    }
    toast({ title: "Task removed" });
  };

  if (loadingExisting) {
    return (
      <Layout>
        <div className="container mx-auto max-w-4xl px-4 py-10">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-64" />
            <div className="h-40 bg-muted rounded-2xl" />
            <div className="h-60 bg-muted rounded-2xl" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto max-w-4xl px-4 py-10">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">Study Plan Generator</h1>
        <p className="text-muted-foreground mb-8">
          {plan ? "Your personalized plan is ready. Check off tasks as you go!" : "Create a personalized daily study plan based on your test date and performance."}
        </p>

        {testDate && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <CountdownCard testDate={testDate} label={testDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} />
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <PlanSetupForm onGenerate={handleGenerate} loading={loading} />
            {plan && weakAreas.length > 0 && <WeakAreasCard weakAreas={weakAreas} />}
            {!user && plan && (
              <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <p className="text-sm text-muted-foreground">
                  <a href="/login" className="text-primary underline font-medium">Sign in</a> to save your plan and track progress across devices.
                </p>
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            {plan ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex gap-1 rounded-lg bg-muted p-1 mb-4">
                  <button onClick={() => setPlanView("weekly")} className={cn(
                    "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    planView === "weekly" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}>Weekly</button>
                  <button onClick={() => setPlanView("calendar")} className={cn(
                    "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    planView === "calendar" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}>Calendar</button>
                </div>

                {planView === "weekly" ? (
                  <PlanDisplay plan={plan} completions={completions} onToggleTask={handleToggleTask} onReset={handleReset}
                    onAddCustomTask={handleAddCustomTask} onDeleteCustomTask={handleDeleteCustomTask} />
                ) : (
                  <PlanCalendar plan={plan} completions={completions} onToggleTask={handleToggleTask}
                    onAddCustomTask={handleAddCustomTask} onDeleteCustomTask={handleDeleteCustomTask} />
                )}
              </motion.div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
                <p className="text-muted-foreground">Select your test date and generate a plan to get started.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Plan;
