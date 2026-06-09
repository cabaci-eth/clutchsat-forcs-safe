// SAT Scoring logic extracted for reuse across Score Calculator and Mock Tests

const MATH_HARD: number[] = [200,230,240,250,260,270,280,290,300,310,320,340,350,360,370,380,400,410,420,440,450,470,480,500,510,530,540,560,570,590,600,620,640,650,670,680,700,710,720,740,750,770,780,790,800];
const RW_HARD: number[] = [200,210,210,220,230,230,240,250,260,270,280,290,300,310,320,330,340,350,360,370,380,390,400,410,420,430,440,450,460,480,490,500,510,530,540,550,560,580,590,610,620,640,650,660,670,690,700,710,730,740,750,770,780,790,800];

function buildEasyTable(hardTable: number[], maxScore: number): number[] {
  const maxRaw = hardTable.length - 1;
  const totalSteps = Math.round((maxScore - 200) / 10);
  return hardTable.map((_, raw) => {
    if (raw === 0) return 200;
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

export function getPercentile(total: number): number {
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

export interface SATScoreResult {
  mathScore: number;
  rwScore: number;
  total: number;
  percentile: number;
  mathHard: boolean;
  rwHard: boolean;
}

export function calculateSATScore(
  mathM1: number, mathM2: number, rwM1: number, rwM2: number
): SATScoreResult {
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
  return { mathScore, rwScore, total, percentile, mathHard, rwHard };
}
