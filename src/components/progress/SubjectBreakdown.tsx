import { motion } from "framer-motion";
import { BarChart3, PieChart } from "lucide-react";
import { Link } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SAT_HIERARCHY, isEnglish } from "@/lib/satStructure";

interface StatsMap {
  [key: string]: { total: number; correct: number };
}

interface Props {
  subjects: StatsMap;
  subsectionStats: StatsMap;
  subSubsectionStats: StatsMap;
  difficultyStats: StatsMap;
}

const subjectColors: Record<string, string> = { Math: "bg-primary", Reading: "bg-secondary", Writing: "bg-accent", English: "bg-secondary" };
const difficultyColors: Record<string, { bg: string; text: string }> = {
  Easy: { bg: "bg-emerald-500", text: "text-emerald-500" },
  Medium: { bg: "bg-amber-500", text: "text-amber-500" },
  Hard: { bg: "bg-destructive", text: "text-destructive" },
};

const SubjectBreakdown = ({ subjects, subsectionStats, subSubsectionStats, difficultyStats }: Props) => {
  const diffTotal = Object.values(difficultyStats).reduce((s, d) => s + d.total, 0);

  // Top 5 weakest subsections (min 3 attempts)
  const weakest = Object.entries(subsectionStats)
    .filter(([, d]) => d.total >= 3)
    .map(([name, d]) => ({ name, accuracy: Math.round((d.correct / d.total) * 100), ...d }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 5);

  const strongest = Object.entries(subsectionStats)
    .filter(([, d]) => d.total >= 3)
    .map(([name, d]) => ({ name, accuracy: Math.round((d.correct / d.total) * 100), ...d }))
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      className="grid gap-4 lg:grid-cols-2"
    >
      {/* Subject Accordion */}
      {Object.keys(subjects).length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="font-display text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Subject Breakdown
          </h2>
          <Accordion type="multiple" className="space-y-1">
            {Object.entries(subjects).map(([subject, data]) => {
              const pct = Math.round((data.correct / data.total) * 100);
              const hierarchy = subject === "Math" ? SAT_HIERARCHY.Math : (isEnglish(subject) ? SAT_HIERARCHY.English : null);
              return (
                <AccordionItem key={subject} value={subject} className="border-none">
                  <AccordionTrigger className="py-2 hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-2">
                      <span className="font-medium text-sm text-foreground">{subject}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{data.correct}/{data.total} ({pct}%)</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-2">
                    <div className="h-2 w-full rounded-full bg-muted mb-3">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} className={`h-2 rounded-full ${subjectColors[subject] || "bg-primary"}`} />
                    </div>
                    {hierarchy && (
                      <Accordion type="multiple" className="space-y-0.5">
                        {Object.entries(hierarchy).map(([subsection, subSubs]) => {
                          const subData = subsectionStats[subsection];
                          if (!subData) return null;
                          const subPct = Math.round((subData.correct / subData.total) * 100);
                          return (
                            <AccordionItem key={subsection} value={subsection} className="border-none ml-2">
                              <AccordionTrigger className="py-1.5 hover:no-underline text-xs">
                                <div className="flex items-center justify-between w-full pr-2">
                                  <span className="text-foreground">{subsection}</span>
                                  <span className="text-muted-foreground tabular-nums">{subData.correct}/{subData.total} ({subPct}%)</span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="pb-1">
                                <div className="h-1.5 w-full rounded-full bg-muted mb-2 ml-2">
                                  <div className={`h-1.5 rounded-full ${subjectColors[subject] || "bg-primary"} opacity-70`} style={{ width: `${subPct}%` }} />
                                </div>
                                <div className="ml-2 space-y-1.5">
                                  {subSubs.map((ss) => {
                                    const ssData = subSubsectionStats[ss];
                                    if (!ssData) return null;
                                    const ssPct = Math.round((ssData.correct / ssData.total) * 100);
                                    return (
                                      <Link key={ss} to={`/practice?subsection=${encodeURIComponent(ss)}`} className="block hover:bg-muted/50 rounded-lg p-1 -mx-1 transition-colors">
                                        <div className="flex items-center justify-between text-xs">
                                          <span className="text-muted-foreground hover:text-foreground transition-colors">{ss}</span>
                                          <span className="text-muted-foreground tabular-nums">{ssData.correct}/{ssData.total} ({ssPct}%)</span>
                                        </div>
                                        <div className="h-1 w-full rounded-full bg-muted mt-0.5">
                                          <div className={`h-1 rounded-full ${subjectColors[subject] || "bg-primary"} opacity-50`} style={{ width: `${ssPct}%` }} />
                                        </div>
                                      </Link>
                                    );
                                  })}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      )}

      {/* Right column: Difficulty + Weakest/Strongest */}
      <div className="space-y-4">
        {/* Difficulty Breakdown */}
        {diffTotal > 0 && (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="font-display text-base font-semibold text-foreground mb-3 flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" /> Difficulty Breakdown
            </h2>
            <div className="flex items-center justify-center mb-4">
              <div className="relative w-28 h-28">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  {(() => {
                    let offset = 0;
                    const colors = { Easy: "hsl(142, 71%, 45%)", Medium: "hsl(38, 92%, 50%)", Hard: "hsl(0, 84%, 60%)" };
                    return (["Easy", "Medium", "Hard"] as const).map((d) => {
                      const val = difficultyStats[d]?.total || 0;
                      const pct = diffTotal > 0 ? (val / diffTotal) * 100 : 0;
                      const el = (
                        <circle key={d} cx="18" cy="18" r="15.9155" fill="none" stroke={colors[d]} strokeWidth="3"
                          strokeDasharray={`${pct} ${100 - pct}`} strokeDashoffset={`-${offset}`} />
                      );
                      offset += pct;
                      return el;
                    });
                  })()}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-lg font-bold text-foreground">{diffTotal}</span>
                  <span className="text-[10px] text-muted-foreground">total</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {(["Easy", "Medium", "Hard"] as const).map((d) => {
                const data = difficultyStats[d];
                if (!data) return null;
                const pct = Math.round((data.correct / data.total) * 100);
                const dc = difficultyColors[d];
                return (
                  <div key={d}>
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span className={`font-medium ${dc.text}`}>{d}</span>
                      <span className="text-muted-foreground tabular-nums">{data.correct}/{data.total} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted">
                      <div className={`h-1.5 rounded-full ${dc.bg}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Weakest Areas */}
        {weakest.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground mb-2">🔻 Weakest Areas</h3>
            <div className="space-y-2">
              {weakest.map((w) => (
                <Link key={w.name} to={`/practice?subsection=${encodeURIComponent(w.name)}`} className="flex items-center justify-between text-xs hover:bg-muted/50 rounded-lg p-1.5 -mx-1.5 transition-colors">
                  <span className="text-foreground truncate mr-2">{w.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-16 h-1.5 rounded-full bg-muted">
                      <div className="h-1.5 rounded-full bg-destructive" style={{ width: `${w.accuracy}%` }} />
                    </div>
                    <span className="text-muted-foreground tabular-nums w-8 text-right">{w.accuracy}%</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Strongest Areas */}
        {strongest.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground mb-2">🔺 Strongest Areas</h3>
            <div className="space-y-2">
              {strongest.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-xs p-1.5 -mx-1.5">
                  <span className="text-foreground truncate mr-2">{s.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-16 h-1.5 rounded-full bg-muted">
                      <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${s.accuracy}%` }} />
                    </div>
                    <span className="text-muted-foreground tabular-nums w-8 text-right">{s.accuracy}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default SubjectBreakdown;
