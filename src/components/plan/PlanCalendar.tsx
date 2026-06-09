import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, Coffee, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { GeneratedPlan, PlanDay, PlanTask } from "@/lib/planGenerator";

interface PlanCalendarProps {
  plan: GeneratedPlan;
  completions: Record<string, boolean>;
  onToggleTask: (taskId: string) => void;
  onAddCustomTask?: (dayDate: string, description: string) => void;
  onDeleteCustomTask?: (taskId: string) => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const toLocalISODate = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const PlanCalendar = ({ plan, completions, onToggleTask, onAddCustomTask, onDeleteCustomTask }: PlanCalendarProps) => {
  const todayStr = toLocalISODate(new Date());

  const dayMap = useMemo(() => {
    const map = new Map<string, PlanDay>();
    for (const week of plan.weeks) {
      for (const day of week.days) {
        map.set(day.date, day);
      }
    }
    return map;
  }, [plan]);

  const allDates = useMemo(() => {
    const dates: string[] = [];
    for (const week of plan.weeks) {
      for (const day of week.days) {
        dates.push(day.date);
      }
    }
    return dates.sort();
  }, [plan]);

  const firstDate = allDates[0] ? new Date(`${allDates[0]}T12:00:00`) : new Date();
  const [viewMonth, setViewMonth] = useState(firstDate.getMonth());
  const [viewYear, setViewYear] = useState(firstDate.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskText, setNewTaskText] = useState("");

  const selectedDay = selectedDate ? dayMap.get(selectedDate) : null;

  const calendarDays = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const startDow = firstOfMonth.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const cells: (number | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewMonth, viewYear]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const handleAddTask = () => {
    if (!selectedDate || !newTaskText.trim() || !onAddCustomTask) return;
    onAddCustomTask(selectedDate, newTaskText.trim());
    setNewTaskText("");
    setAddingTask(false);
  };

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button size="icon" variant="ghost" onClick={prevMonth} className="h-8 w-8">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-sm font-semibold text-foreground">{monthLabel}</h3>
        <Button size="icon" variant="ghost" onClick={nextMonth} className="h-8 w-8">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((dayNum, i) => {
          if (dayNum === null) return <div key={`empty-${i}`} />;

          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
          const planDay = dayMap.get(dateStr);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;

          let completionPct = 0;
          if (planDay && !planDay.isRestDay) {
            const actionable = planDay.tasks.filter((t) => t.type !== "rest");
            const done = actionable.filter((t) => completions[t.id]).length;
            completionPct = actionable.length > 0 ? done / actionable.length : 0;
          }

          return (
            <button
              key={dateStr}
              onClick={() => planDay && setSelectedDate(isSelected ? null : dateStr)}
              className={cn(
                "relative aspect-square rounded-lg text-xs flex flex-col items-center justify-center transition-colors",
                planDay ? "cursor-pointer hover:bg-muted/50" : "text-muted-foreground/30",
                isToday && "ring-1 ring-primary",
                isSelected && "bg-primary/10 ring-1 ring-primary",
                planDay?.isRestDay && "bg-muted/30",
                !planDay && "pointer-events-none"
              )}
            >
              <span className={cn("font-medium", isToday && "text-primary")}>{dayNum}</span>
              {planDay && !planDay.isRestDay && (
                <div className="mt-0.5 h-1 w-4 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", completionPct === 1 ? "bg-success" : "bg-primary")}
                    style={{ width: `${completionPct * 100}%` }}
                  />
                </div>
              )}
              {planDay?.isRestDay && <Coffee className="h-2.5 w-2.5 text-muted-foreground mt-0.5" />}
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">
              Day {selectedDay.dayNumber} –{" "}
              {new Date(`${selectedDay.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </h4>
            {selectedDay.isRestDay && <span className="text-xs text-muted-foreground">Rest Day</span>}
          </div>

          {selectedDay.tasks.map((task) => (
            <div key={task.id} className="flex items-start gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/30 group">
              <button
                type="button"
                onClick={() => task.type !== "rest" && onToggleTask(task.id)}
                className="mt-0.5"
                disabled={task.type === "rest"}
              >
                {task.type === "rest" ? (
                  <Coffee className="h-4 w-4 text-muted-foreground" />
                ) : completions[task.id] ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm", completions[task.id] && "line-through text-muted-foreground")}>{task.description}</p>
                <div className="flex gap-2 mt-0.5">
                  {task.minutes > 0 && <span className="text-xs text-muted-foreground">{task.minutes} min</span>}
                  {task.questionCount && <span className="text-xs text-muted-foreground">· {task.questionCount}q</span>}
                </div>
              </div>
              {(task as any).isCustom && onDeleteCustomTask && (
                <button
                  onClick={() => onDeleteCustomTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity mt-0.5"
                  title="Delete task"
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </button>
              )}
            </div>
          ))}

          {/* Add custom task */}
          {onAddCustomTask && (
            <div className="pt-2 border-t border-border">
              {addingTask ? (
                <div className="flex gap-2">
                  <Input
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    placeholder="e.g., Review algebra notes"
                    className="flex-1 h-9 text-sm"
                    onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
                    autoFocus
                  />
                  <Button size="sm" onClick={handleAddTask} disabled={!newTaskText.trim()} className="h-9">Add</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setAddingTask(false); setNewTaskText(""); }} className="h-9">Cancel</Button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingTask(true)}
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
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

export default PlanCalendar;
