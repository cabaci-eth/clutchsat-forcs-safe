import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WeakArea } from "@/lib/planGenerator";

interface WeakAreasCardProps {
  weakAreas: WeakArea[];
}

const WeakAreasCard = ({ weakAreas }: WeakAreasCardProps) => {
  if (weakAreas.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <h3 className="text-sm font-semibold text-foreground">Performance Summary</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          No significant weak areas detected. Your plan uses a balanced distribution.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-5 w-5 text-accent" />
        <h3 className="text-sm font-semibold text-foreground">Areas Needing Focus</h3>
      </div>
      <div className="space-y-2">
        {weakAreas.map((area, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{area.subsection}</p>
              <p className="text-xs text-muted-foreground">{area.subject}</p>
            </div>
            <div className="flex items-center gap-2 ml-3">
              <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full", area.accuracy < 0.4 ? "bg-destructive" : "bg-accent")}
                  style={{ width: `${Math.round(area.accuracy * 100)}%` }}
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground w-8 text-right">
                {Math.round(area.accuracy * 100)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeakAreasCard;
