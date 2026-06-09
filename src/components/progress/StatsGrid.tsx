import { Target, CheckCircle, TrendingUp, Flame, Trophy, Zap, AlertTriangle, Bookmark } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

interface Props {
  total: number;
  correct: number;
  accuracy: number;
  currentStreak: number;
  avgQuizScore: number;
  xpEarned: number;
  weakestArea: { name: string; accuracy: number } | null;
  savedCount: number;
}

const StatsGrid = ({ total, correct, accuracy, currentStreak, avgQuizScore, xpEarned, weakestArea, savedCount }: Props) => {
  const cards = [
    { icon: Target, label: "Questions Attempted", value: total, color: "text-primary", accent: "from-primary/10 to-primary/5" },
    { icon: CheckCircle, label: "Correct Answers", value: correct, color: "text-emerald-500", accent: "from-emerald-500/10 to-emerald-500/5" },
    { icon: TrendingUp, label: "Accuracy", value: `${accuracy}%`, color: "text-secondary", accent: "from-secondary/10 to-secondary/5" },
    { icon: Flame, label: "Current Streak", value: `${currentStreak}d`, color: "text-orange-500", accent: "from-orange-500/10 to-orange-500/5" },
    { icon: Trophy, label: "Avg Quiz Score", value: `${avgQuizScore}%`, color: "text-amber-500", accent: "from-amber-500/10 to-amber-500/5" },
    { icon: Zap, label: "XP Earned", value: xpEarned.toLocaleString(), color: "text-primary", accent: "from-primary/10 to-primary/5" },
    { icon: Bookmark, label: "Saved Questions", value: savedCount, color: "text-primary", accent: "from-primary/10 to-primary/5" },
  ];

  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
      {cards.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.4 }}
          className="group relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm hover:border-primary/20 hover:shadow-md transition-all duration-300"
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${stat.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
          <div className="relative flex items-start gap-3 overflow-hidden">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted ${stat.color}`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display text-xl font-bold text-foreground truncate">{stat.value}</div>
              <div className="text-[11px] text-muted-foreground leading-tight">{stat.label}</div>
            </div>
          </div>
        </motion.div>
      ))}

      {/* Weakest Area card */}
      {weakestArea && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: cards.length * 0.05, duration: 0.4 }}
        >
          <Link
            to={`/practice?subsection=${encodeURIComponent(weakestArea.name)}`}
            className="group relative flex h-full overflow-hidden rounded-2xl border border-destructive/20 bg-card p-4 shadow-sm hover:border-destructive/40 hover:shadow-md transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 to-destructive/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-start gap-3 overflow-hidden">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display text-sm font-bold text-foreground truncate">{weakestArea.name}</div>
                <div className="text-[11px] text-destructive">{weakestArea.accuracy}% accuracy</div>
                <div className="text-[10px] text-muted-foreground">Tap to practice →</div>
              </div>
            </div>
          </Link>
        </motion.div>
      )}
    </div>
  );
};

export default StatsGrid;
