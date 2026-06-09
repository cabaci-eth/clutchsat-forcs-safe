import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2, Circle, BookOpen, Brain, ClipboardList, Zap, Coffee,
  ChevronDown, ChevronRight, ExternalLink, Plus, Trash2,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { GeneratedPlan, PlanDay, PlanTask, PlanWeek } from "@/lib/planGenerator";

interface PlanDisplayProps {
  plan: GeneratedPlan;
  completions: Record<string, boolean>;
  onToggleTask: (taskId: string) => void;
  onReset: () => void;
  onAddCustomTask?: (dayDate: string, description: string) => void;
  onDeleteCustomTask?: (taskId: string) => void;
}

const taskIcons: Record<string, React.ElementType> = {
  practice: BookOpen, review: Brain, test: ClipboardList, flashcards: Zap, rest: Coffee,
};

const taskColors: Record<string, string> = {
  practice: "text-primary", review: "text-secondary", test: "text-accent-foreground",
  flashcards: "text-accent", rest: "text-muted-foreground",
};

function getSubjectBadgeClass(subject: string) {
  if (subject === "Math") return "bg-primary/10 text-primary";
  if (subject === "English") return "bg-secondary/10 text-secondary";
  return "bg-accent/10 text-accent-foreground";
}

const toLocalISODate = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const getPracticeHref = (task: PlanTask) => {
  if (task.type === "rest" || !task.subject || task.subject === "Mixed") return null;
  const params = new URLSearchParams();
  params.set("subject", task.subject);
  if (task.subsection) params.set("subsection", task.subsection);
  if (task.subSubsection) params.set("subSubSection", task.subSubsection);
  if (task.type === "review" && task.isWeakArea) params.set("mistakes", "all");
  return `/practice?${params.toString()}`;
};

const TaskRow = ({ task, completed, onToggle, onDelete }: {
  task: PlanTask; completed: boolean; onToggle: () => void; onDelete?: () => void;
}) => {
  const Icon = taskIcons[task.type] || BookOpen;
  const practiceHref = getPracticeHref(task);

  return (
    <div className={cn("rounded-lg px-3 py-2 group", task.type !== "rest" && "hover:bg-muted/40")}>
      <div className="flex items-start gap-3">
        <button type="button" onClick={task.type !== "rest" ? onToggle : undefined} disabled={task.type === "rest"} className="mt-0.5 rounded-sm">
          {task.type !== "rest" ? (
            completed ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Circle className="h-5 w-5 text-muted-foreground" />
          ) : (
            <Coffee className="h-5 w-5 text-muted-foreground" />
          )}
        </button>
        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", taskColors[task.type])} />
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-medium", completed && "text-muted-foreground line-through")}>{task.description}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {task.subject && <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", getSubjectBadgeClass(task.subject))}>{task.subject}</span>}
            {task.minutes > 0 && <span className="text-xs text-muted-foreground">{task.minutes} min</span>}
            {task.questionCount && <span className="text-xs text-muted-foreground">· {task.questionCount} questions</span>}
            {task.isWeakArea && task.type === "practice" && <span className="text-xs font-medium text-destructive">Weak area</span>}
          </div>
          {practiceHref && (
            <Link to={practiceHref} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Practice this topic <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
        {(task as any).isCustom && onDelete && (
          <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" title="Delete task">
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </button>
        )}
      </div>
    </div>
  );
};

const DayCard = ({ day, completions, onToggleTask, defaultOpen = false, onAddCustomTask, onDeleteCustomTask }: {
  day: PlanDay; completions: Record<string, boolean>; onToggleTask: (id: string) => void;
  defaultOpen?: boolean; onAddCustomTask?: (dayDate: string, desc: string) => void; onDeleteCustomTask?: (taskId: string) => void;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskText, setNewTaskText] = useState("");
  const completedCount = day.tasks.filter((t) => completions[t.id] && t.type !== "rest").length;
  const actionableCount = day.tasks.filter((t) => t.type !== "rest").length;
  const allDone = actionableCount > 0 && completedCount === actionableCount;
  const dateObj = new Date(`${day.date}T12:00:00`);
  const isToday = toLocalISODate(new Date()) === day.date;

  const handleAddTask = () => {
    if (!newTaskText.trim() || !onAddCustomTask) return;
    onAddCustomTask(day.date, newTaskText.trim());
    setNewTaskText("");
    setAddingTask(false);
  };

  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card", isToday ? "border-primary ring-1 ring-primary/20" : "border-border", allDone && "border-success/30")}>
      <button type="button" onClick={() => setOpen((prev) => !prev)} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/30">
        <div className="flex items-center gap-3">
          {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">Day {day.dayNumber}</span>
              {isToday && <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">Today</span>}
              {day.isRestDay && <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Rest</span>}
              {allDone && !day.isRestDay && <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">Complete</span>}
            </div>
            <span className="text-xs text-muted-foreground">
              {dateObj.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              {!day.isRestDay && ` · ${day.totalMinutes} min`}
            </span>
          </div>
        </div>
        {!day.isRestDay && actionableCount > 0 && <span className="text-xs text-muted-foreground">{completedCount}/{actionableCount}</span>}
      </button>
      {open && (
        <div className="space-y-0.5 px-3 pb-3">
          {day.tasks.map((task) => (
            <TaskRow key={task.id} task={task} completed={!!completions[task.id]} onToggle={() => onToggleTask(task.id)}
              onDelete={(task as any).isCustom && onDeleteCustomTask ? () => onDeleteCustomTask(task.id) : undefined} />
          ))}
          {onAddCustomTask && (
            <div className="pt-2 border-t border-border mt-2">
              {addingTask ? (
                <div className="flex gap-2">
                  <Input value={newTaskText} onChange={(e) => setNewTaskText(e.target.value)} placeholder="e.g., Review algebra notes"
                    className="flex-1 h-9 text-sm" onKeyDown={(e) => e.key === "Enter" && handleAddTask()} autoFocus />
                  <Button size="sm" onClick={handleAddTask} disabled={!newTaskText.trim()} className="h-9">Add</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setAddingTask(false); setNewTaskText(""); }} className="h-9">Cancel</Button>
                </div>
              ) : (
                <button onClick={() => setAddingTask(true)} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                  <Plus className="h-3.5 w-3.5" /> Add custom task
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const WeekCard = ({ week, completions, onToggleTask, defaultOpen, onAddCustomTask, onDeleteCustomTask }: {
  week: PlanWeek; completions: Record<string, boolean>; onToggleTask: (taskId: string) => void;
  defaultOpen: boolean; onAddCustomTask?: (dayDate: string, desc: string) => void; onDeleteCustomTask?: (taskId: string) => void;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const weekTasks = (week.days ?? []).flatMap((d) => d.tasks ?? []).filter((t) => t.type !== "rest");
  const weekCompleted = weekTasks.filter((t) => completions[t.id]).length;
  const weekPct = weekTasks.length > 0 ? Math.round((weekCompleted / weekTasks.length) * 100) : 0;
  const focusTopics = Array.from(new Set(week.days.flatMap((d) => d.tasks ?? []).map((t) => t.subsection).filter(Boolean))).slice(0, 2);
  const startDate = week.days[0]?.date;
  const endDate = week.days[week.days.length - 1]?.date;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <CollapsibleTrigger asChild>
          <button type="button" className="w-full px-5 py-4 text-left hover:bg-muted/30">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <h3 className="font-display text-base font-bold text-foreground">Week {week.weekNumber}</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  {startDate && endDate
                    ? `${new Date(`${startDate}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(`${endDate}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                    : ""}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {week.milestone || "Focus week"}
                  {focusTopics.length > 0 ? ` • ${focusTopics.join(" + ")}` : ""}
                </p>
              </div>
              <div className="min-w-[64px] text-right">
                <p className="text-xs text-muted-foreground">Progress</p>
                <p className="text-lg font-bold text-primary">{weekPct}%</p>
              </div>
            </div>
            <Progress value={weekPct} className="mt-3 h-2" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-2 px-4 pb-4">
            {week.days.map((day) => (
              <DayCard key={day.dayNumber} day={day} completions={completions} onToggleTask={onToggleTask}
                defaultOpen={toLocalISODate(new Date()) === day.date}
                onAddCustomTask={onAddCustomTask} onDeleteCustomTask={onDeleteCustomTask} />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

const PlanDisplay = ({ plan, completions, onToggleTask, onReset, onAddCustomTask, onDeleteCustomTask }: PlanDisplayProps) => {
  const weeks = plan?.weeks ?? [];
  const allTasks = useMemo(
    () => weeks.flatMap((w) => (w.days ?? []).flatMap((d) => d.tasks ?? [])).filter((t) => t.type !== "rest"),
    [weeks]
  );
  const completedTotal = allTasks.filter((t) => completions[t.id]).length;
  const progressPct = allTasks.length > 0 ? Math.round((completedTotal / allTasks.length) * 100) : 0;

  if (weeks.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
        <p className="text-muted-foreground">No schedule found yet. Generate a study plan to get started.</p>
      </div>
    );
  }

  const todayString = toLocalISODate(new Date());

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Overall Progress</h3>
            <p className="text-xs text-muted-foreground">{completedTotal} of {allTasks.length} tasks completed</p>
          </div>
          <span className="font-display text-2xl font-bold text-primary">{progressPct}%</span>
        </div>
        <Progress value={progressPct} className="h-3" />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-foreground">Weekly Plan</h2>
        <Button variant="outline" size="sm" onClick={onReset} className="text-xs">Reset Progress</Button>
      </div>

      <div className="space-y-4">
        {weeks.map((week, index) => (
          <WeekCard key={week.weekNumber} week={week} completions={completions} onToggleTask={onToggleTask}
            defaultOpen={week.days.some((d) => d.date === todayString) || index === 0}
            onAddCustomTask={onAddCustomTask} onDeleteCustomTask={onDeleteCustomTask} />
        ))}
      </div>
    </div>
  );
};

export default PlanDisplay;
