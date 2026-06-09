import { useState } from "react";
import { CalendarDays, Clock, Target, Sparkles, Settings2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { SAT_DATES_2026 } from "@/lib/planGenerator";

interface PlanSetupFormProps {
  onGenerate: (testDate: Date, hoursPerWeek: number, targetScore?: number, dailyHours?: Record<string, number>) => void;
  loading?: boolean;
}

const parseLocalDate = (value: string) => {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const PlanSetupForm = ({ onGenerate, loading }: PlanSetupFormProps) => {
  const [selectedPreset, setSelectedPreset] = useState("");
  const [customDate, setCustomDate] = useState<Date>();
  const [hours, setHours] = useState(10);
  const [targetScore, setTargetScore] = useState("");
  const [useCustomDaily, setUseCustomDaily] = useState(false);
  const [dailyHours, setDailyHours] = useState<Record<string, number>>({
    Mon: 2, Tue: 2, Wed: 2, Thu: 2, Fri: 1, Sat: 1, Sun: 0,
  });

  const isCustom = selectedPreset === "custom";
  const testDate = isCustom
    ? customDate
    : selectedPreset
      ? parseLocalDate(SAT_DATES_2026.find((d) => d.date === selectedPreset)?.date || "")
      : undefined;

  const canGenerate = !!testDate && testDate >= startOfToday();

  const scoreNum = targetScore ? parseInt(targetScore, 10) : undefined;
  const scoreValid = !targetScore || (!!scoreNum && scoreNum >= 400 && scoreNum <= 1600);

  const totalWeeklyFromDaily = Object.values(dailyHours).reduce((s, v) => s + v, 0);
  const effectiveHours = useCustomDaily ? totalWeeklyFromDaily : hours;

  const handleDailyChange = (day: string, val: number) => {
    setDailyHours((prev) => ({ ...prev, [day]: Math.max(0, Math.min(8, val)) }));
  };

  const handleSubmit = () => {
    if (!canGenerate || !testDate) return;
    onGenerate(testDate, effectiveHours, scoreNum, useCustomDaily ? dailyHours : undefined);
  };

  return (
    <div className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-card">
      <div>
        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
          <CalendarDays className="h-4 w-4 text-primary" /> SAT Test Date
        </label>
        <Select value={selectedPreset} onValueChange={setSelectedPreset}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select your test date" />
          </SelectTrigger>
          <SelectContent>
            {SAT_DATES_2026.map((d) => (
              <SelectItem key={d.date} value={d.date}>
                {d.label}
              </SelectItem>
            ))}
            <SelectItem value="custom">Custom Date</SelectItem>
          </SelectContent>
        </Select>

        {isCustom && (
          <div className="mt-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !customDate && "text-muted-foreground")}
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {customDate ? format(customDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customDate}
                  onSelect={setCustomDate}
                  disabled={(date) => date < startOfToday()}
                  initialFocus
                  className={cn("pointer-events-auto p-3")}
                />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      {/* Hours per week */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Clock className="h-4 w-4 text-primary" /> Study Hours
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Custom daily</span>
            <Switch checked={useCustomDaily} onCheckedChange={setUseCustomDaily} />
          </div>
        </div>

        {!useCustomDaily ? (
          <>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Per week:</span>
              <span className="text-sm font-bold text-primary">{hours} hrs</span>
            </div>
            <input
              type="range"
              min={1}
              max={40}
              value={hours}
              onChange={(e) => setHours(+e.target.value)}
              className="w-full accent-primary"
            />
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>1 hr</span>
              <span>40 hrs</span>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            {DAY_NAMES.map((day) => (
              <div key={day} className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-foreground w-10">{day}</span>
                <input
                  type="range"
                  min={0}
                  max={8}
                  step={0.5}
                  value={dailyHours[day]}
                  onChange={(e) => handleDailyChange(day, parseFloat(e.target.value))}
                  className="flex-1 accent-primary"
                />
                <span className="text-xs font-medium text-primary w-10 text-right">{dailyHours[day]}h</span>
              </div>
            ))}
            <div className="text-xs text-muted-foreground text-right">
              Total: <span className="font-semibold text-primary">{totalWeeklyFromDaily} hrs/week</span>
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
          <Target className="h-4 w-4 text-primary" /> Target Score (optional)
        </label>
        <input
          type="number"
          min={400}
          max={1600}
          step={10}
          placeholder="e.g., 1400"
          value={targetScore}
          onChange={(e) => setTargetScore(e.target.value)}
          className={cn(
            "w-full rounded-xl border bg-background px-4 py-2.5 text-sm text-foreground",
            !scoreValid ? "border-destructive" : "border-input"
          )}
        />
        {!scoreValid && <p className="mt-1 text-xs text-destructive">Score must be between 400 and 1600</p>}
      </div>

      <Button
        className="w-full gradient-primary text-primary-foreground shadow-glow"
        disabled={!canGenerate || !scoreValid || loading}
        onClick={handleSubmit}
      >
        <Sparkles className="mr-2 h-4 w-4" />
        {loading ? "Generating..." : "Generate Personalized Plan"}
      </Button>
    </div>
  );
};

export default PlanSetupForm;
