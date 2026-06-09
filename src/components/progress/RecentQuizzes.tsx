import { motion } from "framer-motion";
import { Trophy } from "lucide-react";

interface Quiz {
  id: string;
  subject: string | null;
  score: number;
  total_questions: number;
  created_at: string;
}

const RecentQuizzes = ({ quizzes }: { quizzes: Quiz[] }) => {
  if (quizzes.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      className="rounded-2xl border border-border bg-card p-5 shadow-sm"
    >
      <h2 className="font-display text-base font-semibold text-foreground mb-3 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-primary" /> Recent Quizzes
      </h2>
      <div className="space-y-2">
        {quizzes.slice(0, 8).map((quiz) => {
          const pct = Math.round((quiz.score / quiz.total_questions) * 100);
          return (
            <div key={quiz.id} className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-2.5">
              <div>
                <div className="text-sm font-medium text-foreground">{quiz.subject || "Mixed"} Quiz</div>
                <div className="text-[11px] text-muted-foreground">{new Date(quiz.created_at).toLocaleDateString()}</div>
              </div>
              <div className="text-right">
                <div className="font-display font-bold text-primary text-sm">{quiz.score}/{quiz.total_questions}</div>
                <div className="text-[10px] text-muted-foreground">{pct}%</div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default RecentQuizzes;
