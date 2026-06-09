import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Zap, Trophy } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";

const XP_PER_LEVEL = 500;

const NavbarXP = () => {
  const { user } = useAuth();
  const previousXpRef = useRef<number | null>(null);
  const seenAchievementIdsRef = useRef<Set<string>>(new Set());
  const initializedAchievementsRef = useRef(false);
  const [xpGain, setXpGain] = useState<number | null>(null);

  const { data: xp } = useQuery({
    queryKey: ["navbar_xp", user?.id],
    enabled: !!user,
    refetchInterval: 5000,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_xp")
        .select("total_xp, level")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data || { total_xp: 0, level: 1 };
    },
  });

  const { data: earnedAchievements = [] } = useQuery({
    queryKey: ["navbar_achievements", user?.id],
    enabled: !!user,
    refetchInterval: 5000,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_achievements")
        .select("achievement_id, earned_at, achievements(name, icon)")
        .eq("user_id", user!.id)
        .order("earned_at", { ascending: false });
      return data || [];
    },
  });

  useEffect(() => {
    if (!xp) return;

    if (previousXpRef.current === null) {
      previousXpRef.current = xp.total_xp;
      return;
    }

    if (xp.total_xp > previousXpRef.current) {
      const gain = xp.total_xp - previousXpRef.current;
      setXpGain(gain);
      window.setTimeout(() => setXpGain(null), 1000);
    }

    previousXpRef.current = xp.total_xp;
  }, [xp]);

  useEffect(() => {
    if (!earnedAchievements.length) return;

    const latestIds = new Set(earnedAchievements.map((a: any) => a.achievement_id));

    if (!initializedAchievementsRef.current) {
      seenAchievementIdsRef.current = latestIds;
      initializedAchievementsRef.current = true;
      return;
    }

    earnedAchievements.forEach((item: any) => {
      if (seenAchievementIdsRef.current.has(item.achievement_id)) return;
      const name = item.achievements?.name || "Achievement unlocked";
      toast.success(`🎉 ${name}`, {
        description: "New achievement earned!",
        icon: <Trophy className="h-4 w-4 text-primary" />,
      });
      seenAchievementIdsRef.current.add(item.achievement_id);
    });

    seenAchievementIdsRef.current = latestIds;
  }, [earnedAchievements]);

  if (!user || !xp) return null;

  const levelBaseXp = (xp.level - 1) * XP_PER_LEVEL;
  const nextLevelTotalXp = xp.level * XP_PER_LEVEL;
  const xpInLevel = Math.max(0, xp.total_xp - levelBaseXp);
  const progress = Math.min(100, (xpInLevel / XP_PER_LEVEL) * 100);
  const circumference = 2 * Math.PI * 10;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="relative flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 transition-colors hover:bg-muted"
              style={{ overflow: "visible" }}
            >
              <div className="relative h-6 w-6">
                <svg className="h-6 w-6 -rotate-90" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="hsl(var(--muted))" strokeWidth="2" />
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </svg>
                <Zap className="absolute inset-0 m-auto h-3 w-3 text-primary" />
              </div>
              <span className="text-xs font-bold text-foreground">Lv {xp.level}</span>

              <AnimatePresence>
                {xpGain !== null && (
                  <motion.span
                    initial={{ opacity: 1, y: -4, scale: 0.9 }}
                    animate={{ opacity: 1, y: 10, scale: 1 }}
                    exit={{ opacity: 0, y: 18, scale: 0.9 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary"
                    style={{ top: "100%" }}
                  >
                    +{xpGain} XP
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs font-medium">
            {xp.total_xp.toLocaleString()} XP total • {xpInLevel.toLocaleString()} / {XP_PER_LEVEL.toLocaleString()} this level
          </p>
        </TooltipContent>
      </Tooltip>

      <PopoverContent side="bottom" align="end" className="w-72">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Level {xp.level}</p>
            <p className="text-xs text-muted-foreground">
              {xp.total_xp.toLocaleString()} total XP • {xpInLevel.toLocaleString()} / {XP_PER_LEVEL.toLocaleString()} to next level
            </p>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>

          <div className="space-y-1 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">How to earn XP</p>
            <p>Correct answer: +10 XP</p>
            <p>Any question attempt: +5 XP</p>
            <p>Complete a quiz: +50 XP</p>
            <p>Flashcard review: +5 XP</p>
            <p>Daily login: +20 XP</p>
            <p>Daily Question (correct): +20 XP</p>
            <p>Daily Question (incorrect): +5 XP</p>
            <p>Achievements: bonus XP</p>
          </div>

          <Button asChild size="sm" className="w-full">
            <Link to="/dashboard">Go to Dashboard</Link>
          </Button>

          <p className="text-[11px] text-muted-foreground">
            Next level at {nextLevelTotalXp.toLocaleString()} XP
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NavbarXP;
