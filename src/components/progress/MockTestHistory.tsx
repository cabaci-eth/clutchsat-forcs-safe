import { Link } from "react-router-dom";
import { FileText, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMockTestAttempts } from "@/hooks/useMockTests";
import { format } from "date-fns";

const MockTestHistory = ({ userId }: { userId: string }) => {
  const { data: attempts, isLoading } = useMockTestAttempts(userId);

  if (isLoading || !attempts?.length) return null;

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-semibold text-foreground">Mock Test History</h3>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/mock-tests">
            View All <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
      <div className="space-y-2">
        {attempts.slice(0, 5).map((a) => (
          <div key={a.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-background/50 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {(a as any).mock_tests?.title ?? "Mock Test"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {a.mode === "simulation" ? "Simulation" : "Practice"} •{" "}
                  {format(new Date(a.created_at), "MMM d, yyyy")}
                </p>
              </div>
            </div>
            {a.total_score && (
              <span className="text-lg font-bold text-foreground">{a.total_score}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MockTestHistory;
