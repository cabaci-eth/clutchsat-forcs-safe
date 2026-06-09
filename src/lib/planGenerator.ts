import { SAT_HIERARCHY } from "./satStructure";

// ── Types ──────────────────────────────────────────────────────────────────────
export interface WeakArea {
  subject: string;
  subsection: string;
  subSubsection?: string;
  accuracy: number; // 0–1
  totalAttempted: number;
}

export interface PlanTask {
  id: string;
  type: "practice" | "review" | "test" | "flashcards" | "rest";
  subject: string;
  subsection?: string;
  subSubsection?: string;
  description: string;
  minutes: number;
  questionCount?: number;
  isWeakArea?: boolean;
}

export interface PlanDay {
  dayNumber: number;
  date: string; // ISO date string
  isRestDay: boolean;
  tasks: PlanTask[];
  totalMinutes: number;
}

export interface PlanWeek {
  weekNumber: number;
  days: PlanDay[];
  milestone?: string;
}

export interface GeneratedPlan {
  weeks: PlanWeek[];
  totalDays: number;
  totalStudyHours: number;
  weakAreas: WeakArea[];
  generatedAt: string;
}

export interface PlanGeneratorInput {
  testDate: Date;
  hoursPerWeek: number;
  targetScore?: number;
  weakAreas: WeakArea[];
  dailyHours?: Record<string, number>; // Mon-Sun keyed by day name
}

// ── Constants ──────────────────────────────────────────────────────────────────
const SAT_DATES_2026 = [
  // 2026
  { label: "May 2, 2026", date: "2026-05-02" },
  { label: "June 6, 2026", date: "2026-06-06" },
  { label: "August 22, 2026", date: "2026-08-22" },
  { label: "September 12, 2026", date: "2026-09-12" },
  { label: "October 3, 2026", date: "2026-10-03" },
  { label: "November 7, 2026", date: "2026-11-07" },
  { label: "December 5, 2026", date: "2026-12-05" },
  // Spring 2027
  { label: "March 6, 2027", date: "2027-03-06" },
  { label: "May 1, 2027", date: "2027-05-01" },
  { label: "June 5, 2027", date: "2027-06-05" },
];

export { SAT_DATES_2026 };

const MAX_DAILY_MINUTES = 240; // 4 hours cap
const WEAK_THRESHOLD = 0.6;
const WEAK_WEIGHT = 1.5;

// ── Helpers ────────────────────────────────────────────────────────────────────
let _idCounter = 0;
const taskId = () => `task-${Date.now()}-${++_idCounter}`;

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Build a flat list of all subsections with their subject
function getAllTopics(): { subject: string; subsection: string; subSubsections: string[] }[] {
  const topics: { subject: string; subsection: string; subSubsections: string[] }[] = [];
  for (const [subject, subsections] of Object.entries(SAT_HIERARCHY)) {
    for (const [subsection, subs] of Object.entries(subsections)) {
      topics.push({ subject, subsection, subSubsections: subs });
    }
  }
  return topics;
}

// ── Generator ──────────────────────────────────────────────────────────────────
export function generateStudyPlan(input: PlanGeneratorInput): GeneratedPlan {
  _idCounter = 0;
  const { testDate, hoursPerWeek, weakAreas, dailyHours } = input;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const test = new Date(testDate);
  test.setHours(0, 0, 0, 0);

  const totalDays = Math.max(1, Math.ceil((test.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const totalWeeks = Math.ceil(totalDays / 7);
  const minutesPerWeek = hoursPerWeek * 60;
  const totalStudyHours = Math.round((totalDays / 7) * hoursPerWeek);

  // Build topic weights
  const allTopics = getAllTopics();
  const weakMap = new Map<string, WeakArea>();
  weakAreas.forEach((w) => {
    const key = `${w.subject}|${w.subsection}`;
    weakMap.set(key, w);
  });

  // Weight each topic
  type WeightedTopic = { subject: string; subsection: string; subSubsections: string[]; weight: number; isWeak: boolean };
  const weightedTopics: WeightedTopic[] = allTopics.map((t) => {
    const key = `${t.subject}|${t.subsection}`;
    const weak = weakMap.get(key);
    const isWeak = weak ? weak.accuracy < WEAK_THRESHOLD : false;
    return { ...t, weight: isWeak ? WEAK_WEIGHT : 1, isWeak };
  });

  const totalWeight = weightedTopics.reduce((s, t) => s + t.weight, 0);

  // Calculate minutes per topic per week
  const topicMinutesPerWeek = weightedTopics.map((t) => ({
    ...t,
    minutesPerWeek: Math.round((t.weight / totalWeight) * minutesPerWeek),
  }));

  // Determine daily study budget
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const getDailyBudget = (dayDate: Date): number => {
    if (dailyHours) {
      const dayName = DAY_NAMES[dayDate.getDay()];
      const hrs = dailyHours[dayName] ?? 0;
      return Math.min(MAX_DAILY_MINUTES, hrs * 60);
    }
    const studyDaysPerWeek = 6;
    return Math.min(MAX_DAILY_MINUTES, Math.round(minutesPerWeek / studyDaysPerWeek));
  };

  // Milestones: split topics across weeks
  const topicsPerWeek = Math.max(1, Math.ceil(allTopics.length / totalWeeks));

  const weeks: PlanWeek[] = [];
  let dayCounter = 1;

  for (let w = 0; w < totalWeeks; w++) {
    const weekDays: PlanDay[] = [];
    const weekStartDate = addDays(now, w * 7);

    // Determine which topics to focus on this week (rotate through)
    const focusStart = (w * topicsPerWeek) % topicMinutesPerWeek.length;
    const focusTopics = [];
    for (let i = 0; i < Math.min(topicsPerWeek, topicMinutesPerWeek.length); i++) {
      focusTopics.push(topicMinutesPerWeek[(focusStart + i) % topicMinutesPerWeek.length]);
    }

    // Include up to 2 weak topics per week (not all of them every week)
    const weakTopics = topicMinutesPerWeek.filter((t) => t.isWeak && !focusTopics.includes(t));
    const limitedWeakTopics = weakTopics.slice(0, Math.min(2, weakTopics.length));
    const weekTopics = [...focusTopics, ...limitedWeakTopics];

    for (let d = 0; d < 7; d++) {
      const dayDate = addDays(weekStartDate, d);
      if (dayDate >= test) break; // Don't plan past test date
      if (dayDate < now) continue; // Don't plan in the past

      const dayNumber = dayCounter++;

      // Rest day: Sunday by default, or if custom hours = 0 for this day
      const dayBudget = getDailyBudget(dayDate);
      const isRestDay = dailyHours ? dayBudget === 0 : dayDate.getDay() === 0;

      if (isRestDay) {
        weekDays.push({
          dayNumber,
          date: formatDate(dayDate),
          isRestDay: true,
          tasks: [{ id: taskId(), type: "rest", subject: "", description: "Rest day – recharge for the week ahead!", minutes: 0 }],
          totalMinutes: 0,
        });
        continue;
      }

      // Every 10th study day = practice test
      const isPracticeTestDay = dayNumber > 0 && dayNumber % 10 === 0;

      const tasks: PlanTask[] = [];
      let remainingMinutes = dayBudget;

      if (isPracticeTestDay) {
        tasks.push({
          id: taskId(),
          type: "test",
          subject: "Mixed",
          description: "Full Practice Test – Simulate real SAT conditions",
          minutes: Math.min(remainingMinutes, 180),
          questionCount: 98,
        });
        remainingMinutes -= 180;
        if (remainingMinutes > 0) {
          tasks.push({
            id: taskId(),
            type: "review",
            subject: "Mixed",
            description: "Review practice test results and note weak areas",
            minutes: Math.min(remainingMinutes, 30),
          });
          remainingMinutes -= 30;
        }
      } else {
        // Distribute time across focus topics for this day
        const dayTopicCount = Math.min(3, weekTopics.length);
        const perTopicMinutes = Math.round(remainingMinutes / dayTopicCount);

        for (let t = 0; t < dayTopicCount && remainingMinutes > 0; t++) {
          // Rotate which topics appear on which day
          const topic = weekTopics[(d * dayTopicCount + t) % weekTopics.length];
          const mins = Math.min(perTopicMinutes, remainingMinutes);
          if (mins <= 0) break;

          const questionCount = Math.max(5, Math.round(mins / 3));

          // Main practice task
          tasks.push({
            id: taskId(),
            type: "practice",
            subject: topic.subject,
            subsection: topic.subsection,
            subSubsection: topic.subSubsections[d % topic.subSubsections.length],
            description: `Practice: ${topic.subsection} – ${topic.subSubsections[d % topic.subSubsections.length]}`,
            minutes: Math.round(mins * 0.7),
            questionCount,
            isWeakArea: topic.isWeak,
          });

          // Review/flashcard task for remaining time
          if (mins * 0.3 >= 5) {
            tasks.push({
              id: taskId(),
              type: topic.isWeak ? "review" : "flashcards",
              subject: topic.subject,
              subsection: topic.subsection,
              description: topic.isWeak
                ? `Review mistakes in ${topic.subsection}`
                : `Flashcard review: ${topic.subject} concepts`,
              minutes: Math.round(mins * 0.3),
              isWeakArea: topic.isWeak,
            });
          }

          remainingMinutes -= mins;
        }
      }

      weekDays.push({
        dayNumber,
        date: formatDate(dayDate),
        isRestDay: false,
        tasks,
        totalMinutes: tasks.reduce((s, t) => s + t.minutes, 0),
      });
    }

    if (weekDays.length === 0) continue;

    // Generate milestone
    const milestoneTopics = focusTopics.slice(0, 2).map((t) => t.subsection).join(" & ");
    const milestone = w === totalWeeks - 1
      ? "Final review & practice tests – You're ready!"
      : `Focus on ${milestoneTopics}`;

    weeks.push({ weekNumber: w + 1, days: weekDays, milestone });
  }

  return {
    weeks,
    totalDays,
    totalStudyHours,
    weakAreas,
    generatedAt: new Date().toISOString(),
  };
}
