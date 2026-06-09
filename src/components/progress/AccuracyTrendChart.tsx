import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { format, startOfWeek } from "date-fns";

interface Answer {
  created_at: string;
  is_correct: boolean;
}

interface Props {
  answers: Answer[];
}

const AccuracyTrendChart = ({ answers }: Props) => {
  const data = useMemo(() => {
    if (answers.length === 0) return [];
    const weeks: Record<string, { correct: number; total: number }> = {};
    answers.forEach((a) => {
      const wk = format(startOfWeek(new Date(a.created_at), { weekStartsOn: 1 }), "MMM d");
      if (!weeks[wk]) weeks[wk] = { correct: 0, total: 0 };
      weeks[wk].total++;
      if (a.is_correct) weeks[wk].correct++;
    });
    return Object.entries(weeks)
      .map(([week, d]) => ({ week, accuracy: Math.round((d.correct / d.total) * 100) }))
      .slice(-12);
  }, [answers]);

  if (data.length < 2) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="rounded-2xl border border-border bg-card p-5 shadow-sm"
    >
      <h2 className="font-display text-base font-semibold text-foreground mb-4 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" /> Accuracy Trend
      </h2>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="week" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} className="fill-muted-foreground" unit="%" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.75rem",
                fontSize: 12,
              }}
              formatter={(v: number) => [`${v}%`, "Accuracy"]}
            />
            <Line type="monotone" dataKey="accuracy" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3, fill: "hsl(var(--primary))" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default AccuracyTrendChart;
