import { useState, useMemo } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import Layout from "@/components/Layout";

// Hard path scoring tables
const MATH_HARD: number[] = [200,230,240,250,260,270,280,290,300,310,320,340,350,360,370,380,400,410,420,440,450,470,480,500,510,530,540,560,570,590,600,620,640,650,670,680,700,710,720,740,750,770,780,790,800];
const RW_HARD: number[] = [200,210,210,220,230,230,240,250,260,270,280,290,300,310,320,330,340,350,360,370,380,390,400,410,420,430,440,450,460,480,490,500,510,530,540,550,560,580,590,610,620,640,650,660,670,690,700,710,730,740,750,770,780,790,800];

// Easy path: penalty that scales linearly, capped at ~600-610
function buildEasyTable(hardTable: number[], maxScore: number): number[] {
  const maxRaw = hardTable.length - 1;
  const totalSteps = Math.round((maxScore - 200) / 10);

  return hardTable.map((score, raw) => {
    if (raw === 0) return 200;

    // Conservative adaptive estimate for the easy module path.
    // Uses monotonic step distribution to preserve the lower easy-path ceiling
    // while making one-question changes around the middle matter more often.
    const steppedScore = 200 + Math.floor((raw * totalSteps) / maxRaw) * 10;
    return Math.max(200, Math.min(maxScore, steppedScore));
  });
}

const MATH_EASY = buildEasyTable(MATH_HARD, 600);
const RW_EASY = buildEasyTable(RW_HARD, 610);

const PERCENTILE_TABLE: [number, number][] = [
  [1600, 99.5], [1550, 99], [1500, 98], [1450, 96], [1400, 94], [1350, 90],
  [1300, 86], [1250, 81], [1200, 74], [1150, 67], [1100, 58], [1050, 50],
  [1000, 40], [950, 31], [900, 23], [850, 16], [800, 10], [750, 6], [700, 3],
];

function getPercentile(total: number): number {
  if (total >= 1600) return 99.5;
  if (total < 700) return 2;
  for (let i = 0; i < PERCENTILE_TABLE.length - 1; i++) {
    const [hiScore, hiPct] = PERCENTILE_TABLE[i];
    const [loScore, loPct] = PERCENTILE_TABLE[i + 1];
    if (total >= loScore && total <= hiScore) {
      const ratio = (total - loScore) / (hiScore - loScore);
      return Math.round((loPct + ratio * (hiPct - loPct)) * 10) / 10;
    }
  }
  return 2;
}

function getScoreColor(total: number): string {
  if (total >= 1500) return "text-purple-500 dark:text-purple-400";
  if (total >= 1200) return "text-primary";
  if (total >= 1000) return "text-success";
  if (total >= 800) return "text-amber-500 dark:text-amber-400";
  return "text-destructive";
}

function getScoreBg(total: number): string {
  if (total >= 1500) return "bg-purple-500/10 border-purple-500/30";
  if (total >= 1200) return "bg-primary/10 border-primary/30";
  if (total >= 1000) return "bg-success/10 border-success/30";
  if (total >= 800) return "bg-amber-500/10 border-amber-500/30";
  return "bg-destructive/10 border-destructive/30";
}

const ScoreCalculator = () => {
  const [mathM1, setMathM1] = useState(11);
  const [mathM2, setMathM2] = useState(11);
  const [rwM1, setRwM1] = useState(14);
  const [rwM2, setRwM2] = useState(14);

  const results = useMemo(() => {
    const mathHard = mathM1 >= 15;
    const rwHard = rwM1 >= 18;
    const mathRaw = mathM1 + mathM2;
    const rwRaw = rwM1 + rwM2;
    const mathTable = mathHard ? MATH_HARD : MATH_EASY;
    const rwTable = rwHard ? RW_HARD : RW_EASY;
    const mathScore = mathTable[Math.min(mathRaw, mathTable.length - 1)];
    const rwScore = rwTable[Math.min(rwRaw, rwTable.length - 1)];
    const total = mathScore + rwScore;
    const percentile = getPercentile(total);
    return { mathHard, rwHard, mathRaw, rwRaw, mathScore, rwScore, total, percentile };
  }, [mathM1, mathM2, rwM1, rwM2]);

  const reset = () => { setMathM1(11); setMathM2(11); setRwM1(14); setRwM2(14); };

  const roundedPercentile = Math.round(results.percentile);
  let ordinalSuffix = "th";
  if (roundedPercentile % 10 === 2 && roundedPercentile !== 12) {
    ordinalSuffix = "nd";
  } else if (roundedPercentile % 10 === 1 && roundedPercentile !== 11) {
    ordinalSuffix = "st";
  } else if (roundedPercentile % 10 === 3 && roundedPercentile !== 13) {
    ordinalSuffix = "rd";
  }

  const percentileText = results.percentile >= 50
    ? `You are in the top ${Math.round(100 - results.percentile)}% of test takers`
    : `You are in the ${roundedPercentile}${ordinalSuffix} percentile of test takers`;

  return (
    <Layout>
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">SAT Score Calculator</h1>
            <p className="mt-2 text-muted-foreground">Estimate your SAT score with adaptive module scoring.</p>
          </div>
          <Button variant="outline" size="sm" onClick={reset}><RotateCcw className="mr-1 h-4 w-4" /> Reset</Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Math Section */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-5">
            <h2 className="text-lg font-semibold text-foreground">Math</h2>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">Module 1</label>
                <span className="text-sm font-bold text-primary">{mathM1} / 22</span>
              </div>
              <Slider min={0} max={22} step={1} value={[mathM1]} onValueChange={([v]) => setMathM1(v)} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">Module 2</label>
                <span className="text-sm font-bold text-primary">{mathM2} / 22</span>
              </div>
              <Slider min={0} max={22} step={1} value={[mathM2]} onValueChange={([v]) => setMathM2(v)} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Module 2 Path:</span>
              <span className={`font-semibold ${results.mathHard ? "text-destructive" : "text-success"}`}>
                {results.mathHard ? "Hard" : "Easy"}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">Threshold: ≥15 correct on M1 → Hard path</div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Section Score:</span>
              <span className="text-xl font-bold text-foreground">{results.mathScore} / 800</span>
            </div>
          </div>

          {/* R&W Section */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-5">
            <h2 className="text-lg font-semibold text-foreground">Reading & Writing</h2>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">Module 1</label>
                <span className="text-sm font-bold text-primary">{rwM1} / 27</span>
              </div>
              <Slider min={0} max={27} step={1} value={[rwM1]} onValueChange={([v]) => setRwM1(v)} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">Module 2</label>
                <span className="text-sm font-bold text-primary">{rwM2} / 27</span>
              </div>
              <Slider min={0} max={27} step={1} value={[rwM2]} onValueChange={([v]) => setRwM2(v)} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Module 2 Path:</span>
              <span className={`font-semibold ${results.rwHard ? "text-destructive" : "text-success"}`}>
                {results.rwHard ? "Hard" : "Easy"}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">Threshold: ≥18 correct on M1 → Hard path</div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Section Score:</span>
              <span className="text-xl font-bold text-foreground">{results.rwScore} / 800</span>
            </div>
          </div>
        </div>

        {/* Total Score Card */}
        <div className={`mt-8 rounded-2xl border p-8 text-center shadow-card ${getScoreBg(results.total)}`}>
          <p className="text-sm font-medium text-muted-foreground mb-2">Estimated Total Score</p>
          <p className={`text-6xl font-bold ${getScoreColor(results.total)}`}>{results.total}</p>
          <p className="text-sm text-muted-foreground mt-1">out of 1600</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-background/80 px-4 py-2 text-sm font-medium text-foreground border border-border">
            {percentileText}
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-card">
          <h3 className="text-sm font-semibold text-foreground mb-3">How it works</h3>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li>• Enter the number of correct answers for each module.</li>
            <li>• Math modules have 22 questions each. R&W modules have 27 each.</li>
            <li>• Module 2 difficulty (Easy/Hard) is determined by your Module 1 score.</li>
            <li>• Math: ≥15 correct on M1 → Hard path. R&W: ≥18 correct → Hard path.</li>
            <li>• Easy path caps section scores at ~600–610.</li>
            <li>• Scores are rounded to the nearest 10, matching official College Board scaling.</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
};

export default ScoreCalculator;
