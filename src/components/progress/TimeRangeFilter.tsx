import { TimeRange } from "@/hooks/useProgressData";
import { cn } from "@/lib/utils";

const options: { value: TimeRange; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "6months", label: "6 Months" },
  { value: "month", label: "Last Month" },
  { value: "week", label: "Last Week" },
];

interface Props {
  value: TimeRange;
  onChange: (v: TimeRange) => void;
}

const TimeRangeFilter = ({ value, onChange }: Props) => (
  <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/50 p-1">
    {options.map((o) => (
      <button
        key={o.value}
        onClick={() => onChange(o.value)}
        className={cn(
          "rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200",
          value === o.value
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
      >
        {o.label}
      </button>
    ))}
  </div>
);

export default TimeRangeFilter;
