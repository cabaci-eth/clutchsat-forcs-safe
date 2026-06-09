import { useState, useEffect, useCallback, useMemo } from "react";
import { RotateCcw, Shuffle, ChevronLeft, ChevronRight, Loader2, Settings, Check, Bookmark, List, Layers, Search, X, ArrowDownAZ, ArrowUpAZ, ArrowDown01, ArrowUp01 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import MathText from "@/components/MathText";
import { toast } from "@/hooks/use-toast";

const difficultyColors: Record<string, string> = {
  Easy: "bg-success/10 text-success border-success/30",
  Medium: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700",
  Hard: "bg-destructive/10 text-destructive border-destructive/30",
};

const DIFFICULTY_ORDER: Record<string, number> = { Easy: 1, Medium: 2, Hard: 3 };

type SortOption = "az" | "za" | "diff-asc" | "diff-desc";

const Flashcards = () => {
  const [stage, setStage] = useState<"setup" | "review" | "browse">("setup");
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [difficultyFilter, setDifficultyFilter] = useState<string[]>([]);
  const [learnedFilter, setLearnedFilter] = useState<"all" | "learned" | "unlearned">("all");
  const [savedFilter, setSavedFilter] = useState(false);
  const [numCards, setNumCards] = useState(20);
  const [shouldShuffle, setShouldShuffle] = useState(true);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [cards, setCards] = useState<any[]>([]);
  const [browseSearch, setBrowseSearch] = useState("");
  const [debouncedBrowseSearch, setDebouncedBrowseSearch] = useState("");
  const [browseSort, setBrowseSort] = useState<SortOption>("az");
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Debounce browse search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedBrowseSearch(browseSearch), 400);
    return () => clearTimeout(t);
  }, [browseSearch]);

  const { data: allCards = [], isLoading } = useQuery({
    queryKey: ["flashcards"],
    queryFn: async () => {
      const { data, error } = await supabase.from("flashcards").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: savedFCIds = [] } = useQuery({
    queryKey: ["saved_flashcard_ids", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("saved_flashcards").select("flashcard_id").eq("user_id", user!.id);
      if (error) throw error;
      return data.map((s) => s.flashcard_id);
    },
  });

  const { data: learnedFCIds = [] } = useQuery({
    queryKey: ["learned_flashcard_ids", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_flashcard_reviews").select("flashcard_id").eq("user_id", user!.id).eq("learned", true);
      if (error) throw error;
      return data.map((r) => r.flashcard_id);
    },
  });

  const savedFCSet = useMemo(() => new Set(savedFCIds), [savedFCIds]);
  const learnedFCSet = useMemo(() => new Set(learnedFCIds), [learnedFCIds]);

  const categories = useMemo(() => [...new Set(allCards.map((c) => c.category))], [allCards]);

  const filteredPool = useMemo(() => {
    let pool = allCards;
    if (categoryFilter.length > 0) pool = pool.filter((c) => categoryFilter.includes(c.category));
    if (difficultyFilter.length > 0) pool = pool.filter((c) => c.difficulty && difficultyFilter.includes(c.difficulty));
    if (savedFilter && user) pool = pool.filter((c) => savedFCSet.has(c.id));
    if (learnedFilter === "learned" && user) pool = pool.filter((c) => learnedFCSet.has(c.id));
    if (learnedFilter === "unlearned" && user) pool = pool.filter((c) => !learnedFCSet.has(c.id));
    return pool;
  }, [allCards, categoryFilter, difficultyFilter, savedFilter, learnedFilter, savedFCSet, learnedFCSet, user]);

  // Sorted and searched pool for browse mode
  const browsePool = useMemo(() => {
    let pool = filteredPool;
    if (debouncedBrowseSearch) {
      const lower = debouncedBrowseSearch.toLowerCase();
      pool = pool.filter((c) => c.term.toLowerCase().includes(lower));
    }
    pool = [...pool].sort((a, b) => {
      switch (browseSort) {
        case "az": return a.term.localeCompare(b.term);
        case "za": return b.term.localeCompare(a.term);
        case "diff-asc": return (DIFFICULTY_ORDER[a.difficulty] || 2) - (DIFFICULTY_ORDER[b.difficulty] || 2);
        case "diff-desc": return (DIFFICULTY_ORDER[b.difficulty] || 2) - (DIFFICULTY_ORDER[a.difficulty] || 2);
        default: return 0;
      }
    });
    return pool;
  }, [filteredPool, debouncedBrowseSearch, browseSort]);

  useEffect(() => {
    if (filteredPool.length > 0 && numCards > filteredPool.length) {
      setNumCards(filteredPool.length);
    }
  }, [filteredPool.length]);

  const startSession = () => {
    let pool = [...filteredPool];
    if (shouldShuffle) pool = pool.sort(() => Math.random() - 0.5);
    pool = pool.slice(0, Math.max(1, Math.min(numCards, pool.length)));
    setCards(pool);
    setIndex(0);
    setFlipped(false);
    setStage("review");
  };

  const current = cards[index];

  const next = useCallback(() => { setFlipped(false); setIndex((i) => (i + 1) % cards.length); }, [cards.length]);
  const prev = useCallback(() => { setFlipped(false); setIndex((i) => (i - 1 + cards.length) % cards.length); }, [cards.length]);
  const flip = useCallback(() => setFlipped((f) => !f), []);

  const markLearned = async () => {
    if (!user || !current) return;
    const existing = learnedFCSet.has(current.id);
    if (existing) {
      // Already learned - unmark
      await supabase.from("user_flashcard_reviews").update({ learned: false }).eq("user_id", user.id).eq("flashcard_id", current.id);
    } else {
      // Upsert as learned
      const { data: existingReview } = await supabase.from("user_flashcard_reviews").select("id").eq("user_id", user.id).eq("flashcard_id", current.id).maybeSingle();
      if (existingReview) {
        await supabase.from("user_flashcard_reviews").update({ learned: true, last_reviewed: new Date().toISOString() }).eq("id", existingReview.id);
      } else {
        await supabase.from("user_flashcard_reviews").insert({
          user_id: user.id, flashcard_id: current.id, difficulty: "easy",
          next_review_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          learned: true, last_reviewed: new Date().toISOString(),
        });
      }
    }
    queryClient.invalidateQueries({ queryKey: ["learned_flashcard_ids"] });
    toast({ title: existing ? "Unmarked" : "Marked as learned ✓" });
    if (!existing) next(); // auto-advance when marking learned
  };

  const toggleSaveFC = async (fcId: string) => {
    if (!user) return;
    if (savedFCSet.has(fcId)) {
      await supabase.from("saved_flashcards").delete().eq("user_id", user.id).eq("flashcard_id", fcId);
    } else {
      await supabase.from("saved_flashcards").insert({ user_id: user.id, flashcard_id: fcId });
    }
    queryClient.invalidateQueries({ queryKey: ["saved_flashcard_ids"] });
  };

  useEffect(() => {
    if (stage !== "review") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") next();
      else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") prev();
      else if (e.key === " ") { e.preventDefault(); flip(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [stage, next, prev, flip]);

  if (isLoading) {
    return <Layout><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></Layout>;
  }

  // --- SETUP SCREEN ---
  if (stage === "setup") {
    const maxCards = filteredPool.length;
    return (
      <Layout>
        <div className="container mx-auto max-w-2xl px-4 py-10">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Flashcards</h1>
          <p className="text-muted-foreground mb-8">Set up your flashcard session.</p>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-6">
            <div>
              <label className="text-sm font-medium text-foreground">Category</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {categories.map((c) => (
                  <label key={c} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={categoryFilter.includes(c)} onCheckedChange={() => setCategoryFilter((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])} />
                    <span className="text-muted-foreground">{c}</span>
                  </label>
                ))}
              </div>
              {categoryFilter.length === 0 && <p className="text-xs text-muted-foreground mt-1">All categories selected</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Difficulty</label>
              <div className="mt-2 flex gap-3">
                {["Easy", "Medium", "Hard"].map((d) => (
                  <label key={d} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={difficultyFilter.includes(d)} onCheckedChange={() => setDifficultyFilter((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])} />
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${difficultyColors[d]}`}>{d}</span>
                  </label>
                ))}
              </div>
            </div>

            {user && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Status Filters</label>
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={savedFilter} onCheckedChange={() => setSavedFilter(!savedFilter)} />
                    <span className="text-muted-foreground">Saved only</span>
                  </label>
                </div>
                <div className="flex gap-2">
                  {([["all", "All"], ["learned", "Learned"], ["unlearned", "Not Learned"]] as const).map(([val, label]) => (
                    <Button key={val} size="sm" variant={learnedFilter === val ? "default" : "outline"} onClick={() => setLearnedFilter(val as any)}>{label}</Button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-foreground">
                Number of cards: {numCards} <span className="text-muted-foreground font-normal">/ {maxCards} available</span>
              </label>
              <input
                type="range"
                min={1}
                max={Math.max(1, maxCards)}
                value={Math.min(numCards, maxCards)}
                onChange={(e) => setNumCards(Math.max(1, Math.min(+e.target.value, maxCards)))}
                className="mt-2 w-full accent-primary"
                disabled={maxCards === 0}
              />
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={shouldShuffle} onCheckedChange={() => setShouldShuffle(!shouldShuffle)} />
              <span className="text-foreground font-medium">Shuffle cards</span>
            </label>

            {maxCards === 0 ? (
              <p className="text-sm text-destructive text-center py-2">No flashcards match your criteria.</p>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <Button className="w-full sm:flex-1 gradient-primary text-primary-foreground shadow-glow" onClick={startSession}>
                  <Layers className="mr-1 h-4 w-4" /> Start Session ({maxCards} cards)
                </Button>
                <Button variant="outline" className="w-full sm:flex-1" onClick={() => setStage("browse")}>
                  <List className="mr-1 h-4 w-4" /> Browse All
                </Button>
              </div>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  // --- BROWSE MODE ---
  if (stage === "browse") {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-10">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">Flashcard Library</h1>
              <p className="mt-1 text-sm text-muted-foreground">{browsePool.length} flashcards</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setStage("setup")}><Settings className="mr-1 h-4 w-4" /> Setup</Button>
          </div>

          {/* Browse filters */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-card mb-6 space-y-3">
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Difficulty</label>
                <div className="flex gap-2">
                  {["Easy", "Medium", "Hard"].map((d) => (
                    <label key={d} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <Checkbox checked={difficultyFilter.includes(d)} onCheckedChange={() => setDifficultyFilter((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])} />
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium border ${difficultyColors[d]}`}>{d}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Category</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <label key={c} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <Checkbox checked={categoryFilter.includes(c)} onCheckedChange={() => setCategoryFilter((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])} />
                      <span className="text-muted-foreground">{c}</span>
                    </label>
                  ))}
                </div>
              </div>
              {user && (
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Status</label>
                  <div className="flex gap-2">
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <Checkbox checked={savedFilter} onCheckedChange={() => setSavedFilter(!savedFilter)} />
                      <span className="text-muted-foreground">Saved</span>
                    </label>
                    {([["all", "All"], ["learned", "Learned"], ["unlearned", "Not Learned"]] as const).map(([val, label]) => (
                      <Button key={val} size="sm" variant={learnedFilter === val ? "default" : "outline"} className="h-6 text-xs px-2" onClick={() => setLearnedFilter(val as any)}>{label}</Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Search and Sort bar */}
          <div className="mb-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search terms…"
                value={browseSearch}
                onChange={(e) => setBrowseSearch(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-input bg-background pl-9 pr-9 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              {browseSearch && (
                <button onClick={() => setBrowseSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex gap-1">
              {([
                ["az", ArrowDownAZ, "A → Z"],
                ["za", ArrowUpAZ, "Z → A"],
                ["diff-asc", ArrowDown01, "Easy → Hard"],
                ["diff-desc", ArrowUp01, "Hard → Easy"],
              ] as const).map(([val, Icon, title]) => (
                <Button
                  key={val}
                  size="sm"
                  variant={browseSort === val ? "default" : "outline"}
                  className="h-10 px-3"
                  title={title}
                  onClick={() => setBrowseSort(val as SortOption)}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {browsePool.map((fc) => (
              <div key={fc.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{fc.category}</span>
                    {fc.difficulty && (
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${difficultyColors[fc.difficulty]}`}>{fc.difficulty}</span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {user && (
                      <>
                        <button onClick={() => toggleSaveFC(fc.id)} className={`p-1 rounded hover:bg-muted ${savedFCSet.has(fc.id) ? "text-primary" : "text-muted-foreground"}`}>
                          <Bookmark className={`h-4 w-4 ${savedFCSet.has(fc.id) ? "fill-current" : ""}`} />
                        </button>
                        {learnedFCSet.has(fc.id) && <Check className="h-4 w-4 text-success" />}
                      </>
                    )}
                  </div>
                </div>
                <div className="font-medium text-foreground mb-1"><MathText text={fc.term} /></div>
                <div className="text-sm text-muted-foreground"><MathText text={fc.definition} /></div>
              </div>
            ))}
          </div>
          {browsePool.length === 0 && <p className="text-center text-muted-foreground py-10">No flashcards match your filters.</p>}
        </div>
      </Layout>
    );
  }

  // --- REVIEW MODE ---
  if (!current) return <Layout><div className="container mx-auto px-4 py-20 text-center text-muted-foreground">No flashcards found.</div></Layout>;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-10">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Flashcards</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Press <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">Space</kbd> to flip, <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">←</kbd> <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">→</kbd> to navigate
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => setStage("setup")}><Settings className="mr-1 h-4 w-4" /> Setup</Button>
            <Button size="sm" variant="outline" onClick={() => { setCards([...cards].sort(() => Math.random() - 0.5)); setIndex(0); setFlipped(false); }}><Shuffle className="mr-1 h-4 w-4" /> Shuffle</Button>
            <Button size="sm" variant="outline" onClick={() => { setIndex(0); setFlipped(false); }}><RotateCcw className="mr-1 h-4 w-4" /> Restart</Button>
          </div>
        </div>

        <div className="mx-auto max-w-lg">
          <div className="mb-6" style={{ perspective: "1000px" }}>
            <motion.div
              className="relative h-64 w-full cursor-pointer"
              onClick={flip}
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 25 }}
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-8 shadow-card" style={{ backfaceVisibility: "hidden" }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-muted-foreground">{current.category}</span>
                  {current.difficulty && (
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${difficultyColors[current.difficulty]}`}>{current.difficulty}</span>
                  )}
                  {learnedFCSet.has(current.id) && <Check className="h-4 w-4 text-success" />}
                </div>
                <span className="font-display text-2xl font-bold text-foreground text-center">
                  <MathText text={current.term} />
                </span>
                <span className="mt-4 text-xs text-muted-foreground">Tap to reveal</span>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-primary/30 bg-primary/5 p-8 shadow-card" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                <span className="mb-2 text-xs font-medium text-primary">Definition</span>
                <span className="text-center text-lg text-foreground">
                  <MathText text={current.definition} />
                </span>
              </div>
            </motion.div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button variant="outline" size="sm" onClick={prev}><ChevronLeft className="h-4 w-4" /></Button>
            <div className="flex items-center gap-2">
              {user && (
                <>
                  <Button
                    size="sm"
                    variant={learnedFCSet.has(current.id) ? "default" : "outline"}
                    className={learnedFCSet.has(current.id) ? "bg-success text-success-foreground hover:bg-success/90" : ""}
                    onClick={markLearned}
                  >
                    <Check className="mr-1 h-4 w-4" /> {learnedFCSet.has(current.id) ? "Learned" : "I Know It"}
                  </Button>
                  <button onClick={() => toggleSaveFC(current.id)} className={`p-2 rounded-md border ${savedFCSet.has(current.id) ? "border-primary text-primary" : "border-border text-muted-foreground"} hover:bg-muted`}>
                    <Bookmark className={`h-4 w-4 ${savedFCSet.has(current.id) ? "fill-current" : ""}`} />
                  </button>
                </>
              )}
            </div>
            <span className="text-sm text-muted-foreground">{index + 1} / {cards.length}</span>
            <Button variant="outline" size="sm" onClick={next}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Flashcards;
