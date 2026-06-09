import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Flame, Zap, Trophy, Target, BookOpen, Brain, CalendarDays,
  ArrowRight, BarChart3, Layers, Award, TrendingUp, Info, Lock, Crown, FileText,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import DailyQuestion from "@/components/DailyQuestion";

const iconMap: Record<string, any> = {
  target: Target, award: Award, star: Trophy, flame: Flame,
  layers: Layers, users: Target, trophy: Trophy, calculator: BarChart3,
  "book-open": BookOpen,
};

const anim = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } };

// ── Mock data for non-logged-in teaser ──
const mockData = {
  streak: { current: 7, longest: 14 },
  xp: { total: 1250, level: 3 },
  achievements: [
    { name: "First Practice", icon: "target" },
    { name: "Getting Started", icon: "target" },
    { name: "7-Day Streak", icon: "flame" },
  ],
  weakArea: { subsection: "Algebra", subject: "Math", accuracy: 0.52 },
  recentQuiz: { score: 8, total: 10, subject: "Math" },
  recentFlashcards: 42,
};

// ── Teaser overlay for non-logged-in users ──
const DashboardTeaser = () => (
  <Layout>
    <div className="container mx-auto max-w-5xl px-4 py-8 relative">
      {/* Blurred mock content */}
      <div className="select-none pointer-events-none filter blur-[6px]" aria-hidden="true">
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold">S</div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Welcome back, Student!</h1>
            <p className="text-muted-foreground text-sm">Let's keep the momentum going 🚀</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border-border bg-card"><CardContent className="p-5"><div className="flex items-center gap-3 mb-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10"><Flame className="h-5 w-5 text-orange-500" /></div><span className="text-sm font-medium text-muted-foreground">Streak</span></div><p className="text-3xl font-bold text-foreground">7 <span className="text-base font-normal text-muted-foreground">days</span></p></CardContent></Card>
          <Card className="border-border bg-card"><CardContent className="p-5"><div className="flex items-center gap-3 mb-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><Zap className="h-5 w-5 text-primary" /></div><span className="text-sm font-medium text-muted-foreground">Level 3</span></div><p className="text-3xl font-bold text-foreground">1,250 <span className="text-base font-normal text-muted-foreground">XP</span></p><Progress value={50} className="h-2 mt-2" /></CardContent></Card>
          <Card className="border-border bg-card"><CardContent className="p-5"><div className="flex items-center gap-3 mb-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10"><Trophy className="h-5 w-5 text-accent-foreground" /></div><span className="text-sm font-medium text-muted-foreground">Next Achievement</span></div><p className="text-sm font-semibold text-foreground">Century Club</p><Progress value={45} className="h-2 mt-2" /></CardContent></Card>
          <Card className="border-border bg-card"><CardContent className="p-5"><div className="flex items-center gap-3 mb-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10"><Target className="h-5 w-5 text-destructive" /></div><span className="text-sm font-medium text-muted-foreground">Weakest Area</span></div><p className="text-sm font-semibold text-foreground">Algebra</p><p className="text-xs text-muted-foreground">Math • 52% accuracy</p></CardContent></Card>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-border bg-card h-40" />
          <Card className="border-border bg-card h-40" />
        </div>
      </div>

      {/* Overlay CTA */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card/95 backdrop-blur-sm border border-border rounded-2xl shadow-xl p-8 text-center max-w-md mx-4"
        >
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Lock className="h-7 w-7 text-primary" />
            </div>
          </div>
          <h2 className="font-display text-xl font-bold text-foreground mb-2">Your Personalized Dashboard</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Track your streaks, earn XP, unlock achievements, and get personalized study recommendations.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg">
              <Link to="/signup">Sign Up Free</Link>
            </Button>
            <Button variant="outline" asChild size="lg">
              <Link to="/login">Log In</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  </Layout>
);

// ── Main Dashboard ──
const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["dash_profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("username, avatar_url").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data, isLoading } = useDashboardData();
  const { data: subscription } = useSubscription();
  const isPremium = subscription?.subscribed;

  useEffect(() => {
    if (user) {
      supabase.rpc("check_achievements", { p_user_id: user.id }).then(() => {});
    }
  }, [user]);

  if (authLoading) {
    return (
      <Layout>
        <div className="container mx-auto max-w-5xl px-4 py-10">
          <Skeleton className="h-10 w-64 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) return <DashboardTeaser />;

  const displayName = profile?.username || user.email?.split("@")[0] || "Student";
  const xpInLevel = data ? data.xp.total % 500 : 0;
  const xpProgress = data ? (xpInLevel / 500) * 100 : 0;

  return (
    <Layout>
      <div className="container mx-auto max-w-5xl px-4 py-8">
        {/* Header */}
        <motion.div {...anim} className="mb-8">
          <div className="flex items-center gap-4">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover border-2 border-primary/20" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full gradient-primary text-primary-foreground text-xl font-bold">
                {displayName[0].toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-bold text-foreground">Welcome back, {displayName}!</h1>
                {isPremium && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    <Crown className="w-3 h-3" /> Premium
                  </span>
                )}
              </div>
              {!isPremium && (
                <Link to="/pricing" className="text-xs text-primary hover:underline mt-0.5 inline-block">
                  ⚡ Upgrade to Premium
                </Link>
              )}
              <p className="text-muted-foreground text-sm">Let's keep the momentum going 🚀</p>
            </div>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
          </div>
        ) : data ? (
          <>
            {/* Top stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Streak */}
              <motion.div {...anim} transition={{ delay: 0.05 }}>
                <Card className="border-border bg-card shadow-card h-full">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10">
                        <Flame className="h-5 w-5 text-orange-500" />
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">Streak</span>
                    </div>
                    <p className="text-3xl font-bold text-foreground">{data.streak.current} <span className="text-base font-normal text-muted-foreground">days</span></p>
                    <p className="text-xs text-muted-foreground mt-1">Longest: {data.streak.longest} days</p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Level & XP */}
              <motion.div {...anim} transition={{ delay: 0.1 }}>
                <Card className="border-border bg-card shadow-card h-full">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                          <Zap className="h-5 w-5 text-primary" />
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">Level {data.xp.level}</span>
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="text-muted-foreground hover:text-foreground transition-colors">
                            <Info className="h-4 w-4" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 text-sm" side="bottom" align="end">
                          <p className="font-semibold text-foreground mb-2">How to earn XP</p>
                          <ul className="space-y-1 text-muted-foreground text-xs">
                            <li>✅ Correct answer: <span className="text-foreground font-medium">+10 XP</span></li>
                            <li>📝 Any attempt: <span className="text-foreground font-medium">+5 XP</span></li>
                            <li>🏆 Complete a quiz: <span className="text-foreground font-medium">+50 XP</span></li>
                            <li>📇 Flashcard review: <span className="text-foreground font-medium">+5 XP</span></li>
                            <li>🔥 Daily login: <span className="text-foreground font-medium">+20 XP</span></li>
                            <li>📅 Daily Question (correct): <span className="text-foreground font-medium">+20 XP</span></li>
                            <li>📅 Daily Question (wrong): <span className="text-foreground font-medium">+5 XP</span></li>
                            <li>🏆 Earn achievement: <span className="text-foreground font-medium">bonus XP</span></li>
                            <li>📈 Every 500 XP = next level</li>
                          </ul>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <p className="text-3xl font-bold text-foreground">{data.xp.total.toLocaleString()} <span className="text-base font-normal text-muted-foreground">XP</span></p>
                    <Progress value={xpProgress} className="h-2 mt-2" />
                    <p className="text-xs text-muted-foreground mt-1">{xpInLevel}/500 to next level</p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Next Achievement */}
              <motion.div {...anim} transition={{ delay: 0.15 }}>
                <Card className="border-border bg-card shadow-card h-full">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                        <Trophy className="h-5 w-5 text-accent-foreground" />
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">Next Achievement</span>
                    </div>
                    {data.achievements.nextUp ? (
                      <>
                        <p className="text-sm font-semibold text-foreground">{data.achievements.nextUp.name}</p>
                        <p className="text-xs text-muted-foreground">{data.achievements.nextUp.description}</p>
                        <Progress value={data.achievements.nextProgress * 100} className="h-2 mt-2" />
                        <p className="text-xs text-muted-foreground mt-1">{Math.round(data.achievements.nextProgress * 100)}% complete</p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">All achievements earned! 🎉</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Weak Area */}
              <motion.div {...anim} transition={{ delay: 0.2 }}>
                <Card className="border-border bg-card shadow-card h-full">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
                        <Target className="h-5 w-5 text-destructive" />
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">Weakest Area</span>
                    </div>
                    {data.weakArea ? (
                      <>
                        <p className="text-sm font-semibold text-foreground">{data.weakArea.subsection}</p>
                        <p className="text-xs text-muted-foreground">{data.weakArea.subject} • {Math.round(data.weakArea.accuracy * 100)}% accuracy</p>
                        <Link to="/practice" className="text-xs text-primary font-medium mt-2 inline-flex items-center gap-1 hover:underline">
                          Practice now <ArrowRight className="h-3 w-3" />
                        </Link>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Answer more questions to find weak areas</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Middle row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              {/* Upcoming Study Plan */}
              <motion.div {...anim} transition={{ delay: 0.25 }}>
                <Card className="border-border bg-card shadow-card h-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      Upcoming Study Tasks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.upcomingTasks.length > 0 ? (
                      <div className="space-y-3">
                        {data.upcomingTasks.map((task, i) => (
                          <div key={i} className="flex items-start gap-3 rounded-xl bg-muted/50 p-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary shrink-0">
                              D{task.day}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {new Date(task.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                              </p>
                              <p className="text-xs text-muted-foreground">{task.topics.join(", ")}</p>
                            </div>
                          </div>
                        ))}
                        <Link to="/plan" className="text-xs text-primary font-medium inline-flex items-center gap-1 hover:underline">
                          View full plan <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground mb-2">No active study plan</p>
                        <Button size="sm" variant="outline" asChild>
                          <Link to="/plan">Create a plan</Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Recent Activity */}
              <motion.div {...anim} transition={{ delay: 0.3 }}>
                <Card className="border-border bg-card shadow-card h-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {data.recentQuiz ? (
                        <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10">
                            <BarChart3 className="h-4 w-4 text-secondary" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">
                              Quiz: {data.recentQuiz.score}/{data.recentQuiz.total} correct
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {data.recentQuiz.subject ?? "Mixed"} • {new Date(data.recentQuiz.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ) : null}
                      <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                          <Layers className="h-4 w-4 text-accent-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{data.recentFlashcards} flashcards reviewed</p>
                          <p className="text-xs text-muted-foreground">All time</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Achievements earned */}
            {data.achievements.earned.length > 0 && (
              <motion.div {...anim} transition={{ delay: 0.35 }}>
                <Card className="border-border bg-card shadow-card mb-6">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Award className="h-4 w-4 text-primary" />
                      Achievements Earned ({data.achievements.earned.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3">
                      {data.achievements.earned.map((a: any, i: number) => {
                        const Icon = iconMap[a?.icon] ?? Trophy;
                        const earnedDate = a?.earned_at ? new Date(a.earned_at).toLocaleDateString() : null;

                        return (
                          <Popover key={a?.achievement_id || i}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <PopoverTrigger asChild>
                                  <button type="button" className="rounded-xl text-left">
                                    <motion.div
                                      initial={{ scale: 0, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      transition={{ delay: 0.4 + i * 0.05, type: "spring", stiffness: 300, damping: 20 }}
                                      className="flex items-center gap-2 rounded-xl border border-primary/10 bg-primary/5 px-3 py-2"
                                    >
                                      <Icon className="h-4 w-4 text-primary" />
                                      <span className="text-sm font-medium text-foreground">{a?.name}</span>
                                    </motion.div>
                                  </button>
                                </PopoverTrigger>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                <p className="font-semibold">{a?.name}</p>
                                {a?.description && <p className="text-xs text-muted-foreground">{a.description}</p>}
                                {earnedDate && <p className="text-xs text-muted-foreground">Earned on {earnedDate}</p>}
                              </TooltipContent>
                            </Tooltip>

                            <PopoverContent className="w-64" side="bottom">
                              <p className="text-sm font-semibold text-foreground">{a?.name}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{a?.description || "Achievement unlocked."}</p>
                              {earnedDate && <p className="mt-2 text-xs text-muted-foreground">Earned on {earnedDate}</p>}
                            </PopoverContent>
                          </Popover>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Daily Question */}
            <motion.div {...anim} transition={{ delay: 0.37 }} className="mb-6">
              <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                Today's Challenge
              </h2>
              <DailyQuestion />
            </motion.div>

            {/* Quick Actions */}
            <motion.div {...anim} transition={{ delay: 0.4 }}>
              <Card className="border-border bg-card shadow-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap justify-center gap-3">
                    {[
                      { to: "/practice", icon: BookOpen, label: "Practice", color: "bg-primary/10 text-primary" },
                      { to: "/quiz", icon: BarChart3, label: "Quiz", color: "bg-secondary/10 text-secondary" },
                      { to: "/mock-tests", icon: FileText, label: "Mock Tests", color: "bg-primary/10 text-primary" },
                      { to: "/flashcards", icon: Brain, label: "Flashcards", color: "bg-accent/10 text-accent-foreground" },
                      { to: "/plan", icon: CalendarDays, label: "Study Plan", color: "bg-success/10 text-success" },
                    ].map((action) => (
                      <Link
                        key={action.to}
                        to={action.to}
                        className="flex w-[calc(50%-0.375rem)] sm:w-[calc(20%-0.6rem)] flex-col items-center gap-2 rounded-xl border border-border p-4 hover:bg-muted transition-colors"
                      >
                        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", action.color)}>
                          <action.icon className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-medium text-foreground">{action.label}</span>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        ) : null}
      </div>
    </Layout>
  );
};

export default Dashboard;
