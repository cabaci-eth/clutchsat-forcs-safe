import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Brain, CalendarDays, ArrowRight, Target, TrendingUp, Star, Quote, MessageSquare, Users, BarChart3, Trophy, Calculator, Crown, ChevronRight, GraduationCap, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, useInView } from "framer-motion";
import Layout from "@/components/Layout";
import DailyQuestion from "@/components/DailyQuestion";
import { useIsMobile } from "@/hooks/use-mobile";

const features = [
  { icon: BookOpen, title: "Thousands of Questions", description: "Realistic SAT math, reading, and writing questions with detailed explanations for every answer.", color: "bg-primary/10 text-primary" },
  { icon: Brain, title: "Smart Flashcards", description: "Vocabulary and formula flashcards with difficulty filters and keyboard shortcuts.", color: "bg-secondary/10 text-secondary" },
  { icon: FileText, title: "Full‑Length Mock Tests", description: "Bluebook‑accurate simulations with adaptive scoring. Practice or simulate the real test experience.", color: "bg-primary/10 text-primary" },
  { icon: GraduationCap, title: "Ace — AI SAT Tutor", description: "Your personal AI tutor. Get instant help with concepts, questions, and strategies.", color: "bg-secondary/10 text-secondary" },
  { icon: CalendarDays, title: "Personalized Study Plan", description: "Generate a daily plan based on your test date and available time. Stay on track effortlessly.", color: "bg-accent/10 text-accent-foreground" },
  { icon: MessageSquare, title: "Community Forum", description: "Get help from fellow students, discuss tricky questions, and share tips and strategies.", color: "bg-success/10 text-success" },
  { icon: Users, title: "Community Question Bank", description: "Practice with questions submitted by other students and contribute your own.", color: "bg-primary/10 text-primary" },
  { icon: Calculator, title: "Built-in Desmos Calculator", description: "Official College Board Desmos graphing calculator — drag, resize, and use alongside any question.", color: "bg-accent/10 text-accent-foreground" },
  { icon: BarChart3, title: "Progress Tracking", description: "Watch your scores improve with detailed analytics broken down by subject and difficulty.", color: "bg-secondary/10 text-secondary" },
];

const stats = [
  { value: 2000, suffix: "+", label: "Practice Questions", icon: Target },
  { value: 500, suffix: "+", label: "Flashcards", icon: Brain },
  { value: 5, suffix: "+", label: "Full Mock Tests", icon: FileText },
  { value: 184, suffix: "pt", label: "Average Score Increase", icon: TrendingUp },
  { value: 150, suffix: "+", label: "Students scored 1500+", icon: Trophy },
];

const testimonials = [
  { name: "studygrind_24", initials: "SG", improvement: "1210 → 1420", quote: "Started at 1210, after 3 months of using ClutchSAT daily I hit 1420! The reading tips were a game-changer." },
  { name: "future_doctor", initials: "FD", improvement: "1280 → 1430", quote: "The community forum saved me – someone explained a tricky geometry problem in a way that finally clicked." },
  { name: "eagle_scout2025", initials: "ES", improvement: "1350 → 1510", quote: "Went from 1350 to 1510 in 6 weeks. Flashcards and the quiz mode with timing really helped my pacing." },
  { name: "stem_girl", initials: "SG", improvement: "1190 → 1370", quote: "Honestly just using this for math brought my score up 80 points. The grid-in questions feel just like the real test." },
];

// ── Animated counter ──
const AnimatedNumber = ({ value, suffix }: { value: number; suffix: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const duration = 1200;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, value]);

  return <span ref={ref}>{display.toLocaleString()}{suffix}</span>;
};

const FeatureCard = ({ feature }: { feature: typeof features[number] }) => (
  <div className="group flex w-[280px] shrink-0 flex-col rounded-2xl border border-border/80 bg-card p-6 shadow-card card-hover hover:border-primary/20">
    <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${feature.color}`}>
      <feature.icon className="h-6 w-6" />
    </div>
    <h3 className="font-display text-lg font-semibold text-foreground">{feature.title}</h3>
    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
  </div>
);

const DesktopFeatureConveyor = () => (
  <div className="relative w-full">
    <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent" />
    <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent" />
    <div className="flex animate-scroll-left hover:[animation-play-state:paused] w-max gap-5 px-4">
      {[...features, ...features].map((feature, i) => (
        <FeatureCard key={`${feature.title}-${i}`} feature={feature} />
      ))}
    </div>
  </div>
);

const MobileFeatureCarousel = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % features.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.children[activeIndex] as HTMLElement;
    if (!card) return;
    const scrollLeft = card.offsetLeft - (track.offsetWidth - card.offsetWidth) / 2;
    track.scrollTo({ left: scrollLeft, behavior: "smooth" });
  }, [activeIndex]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    currentX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const diff = startX.current - currentX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        setActiveIndex((prev) => (prev + 1) % features.length);
      } else {
        setActiveIndex((prev) => (prev - 1 + features.length) % features.length);
      }
    }
  }, []);

  return (
    <div className="relative px-2">
      <p className="text-center text-xs text-muted-foreground mb-4 flex items-center justify-center gap-1.5">
        <span>Swipe to explore features</span>
        <ArrowRight className="h-3 w-3" />
      </p>
      <div
        ref={trackRef}
        className="flex gap-4 overflow-x-hidden scroll-smooth snap-x snap-mandatory px-8"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {features.map((feature) => (
          <div key={feature.title} className="snap-center shrink-0 w-[85vw] max-w-[300px]">
            <FeatureCard feature={feature} />
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-1.5 mt-5">
        {features.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === activeIndex ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"
            }`}
            aria-label={`Go to feature ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

const Index = () => {
  const isMobile = useIsMobile();
  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/10 blur-[100px]" />
          <div className="absolute top-1/2 -left-32 h-72 w-72 rounded-full bg-secondary/10 blur-[80px]" />
          <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-accent/8 blur-[60px]" />
        </div>

        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
          }}
        />

        <div className="container relative mx-auto px-4 pt-16 pb-20 md:pt-24 md:pb-28">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-4xl text-center"
          >
            {/* Top pill */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-5 py-2 text-sm font-medium text-primary backdrop-blur-sm"
            >
              <GraduationCap className="h-4 w-4" />
              <span>Free to get started — no credit card required</span>
            </motion.div>

            {/* Main heading */}
            <h1 className="font-display text-5xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-6xl md:text-7xl">
              Your SAT score,{" "}
              <span className="relative">
                <span className="text-gradient">reimagined</span>
                <motion.span
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }}
                  className="absolute -bottom-1 left-0 right-0 h-1 rounded-full bg-gradient-to-r from-primary to-secondary origin-left"
                />
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl leading-relaxed">
              Thousands of real questions, smart flashcards, full mock tests, an AI tutor,
              and a study plan shaped around your schedule. Your best SAT score starts here.
            </p>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
            >
              <Button size="lg" className="gradient-primary text-primary-foreground shadow-glow px-8 h-12 text-base font-semibold" asChild>
                <Link to="/practice">
                  Start Practicing <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base h-12 px-6" asChild>
                <Link to="/quiz">Take a Quiz</Link>
              </Button>
            </motion.div>

            {/* Social proof line */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="mt-6 text-sm text-muted-foreground flex items-center justify-center gap-2"
            >
              <span className="flex -space-x-2">
                {["SG", "FD", "ES", "SG"].map((initials, i) => (
                  <span
                    key={i}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-primary/10 text-[10px] font-bold text-primary"
                  >
                    {initials}
                  </span>
                ))}
              </span>
              <span>Trusted by <strong className="text-foreground">thousands</strong> of students</span>
            </motion.p>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mx-auto mt-10 w-full max-w-5xl"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 justify-items-center">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + i * 0.08 }}
                  className={`w-full rounded-2xl border border-border/80 bg-card/50 backdrop-blur-sm p-4 sm:p-5 text-center shadow-card card-hover hover:border-primary/20 ${
                    i === stats.length - 1 ? "col-span-2 sm:col-span-1 max-w-[200px] sm:max-w-none" : ""
                  }`}
                >
                  <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                    <stat.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="font-display text-xl font-bold text-foreground sm:text-2xl">
                    <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="text-[11px] text-muted-foreground sm:text-xs mt-0.5">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Daily Question */}
      <section className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          viewport={{ once: true, margin: "-60px" }}
          className="mx-auto max-w-2xl text-center mb-8"
        >
          <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
            Today's <span className="text-gradient">Challenge</span>
          </h2>
          <p className="mt-4 text-muted-foreground">Test yourself with a daily Math and English question.</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          viewport={{ once: true, margin: "-40px" }}
          className="mx-auto max-w-4xl"
        >
          <DailyQuestion />
        </motion.div>
      </section>

      {/* Features */}
      <section className="py-16 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          viewport={{ once: true, margin: "-60px" }}
          className="container mx-auto px-4 text-center mb-10"
        >
          <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
            Everything you need to{" "}
            <span className="text-gradient">crush the SAT</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Built by students, for students. Our tools adapt to your learning style.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          viewport={{ once: true, margin: "-40px" }}
        >
          {isMobile ? <MobileFeatureCarousel /> : <DesktopFeatureConveyor />}
        </motion.div>
      </section>

      {/* Testimonials */}
      <section className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          viewport={{ once: true, margin: "-60px" }}
          className="mx-auto max-w-2xl text-center mb-12"
        >
          <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
            Real results from <span className="text-gradient">real students</span>
          </h2>
          <p className="mt-4 text-muted-foreground">See how students improved their scores with ClutchSAT.</p>
        </motion.div>
        <div className="mx-auto max-w-5xl grid gap-6 md:grid-cols-2">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-border/80 bg-card p-6 shadow-card card-hover hover:border-primary/20"
            >
              <Quote className="h-6 w-6 text-primary/30 mb-3" />
              <p className="text-sm text-foreground leading-relaxed mb-4">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-primary text-primary-foreground text-sm font-bold">
                  {t.initials}
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">@{t.name}</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3 text-success" />
                    {t.improvement}
                  </div>
                </div>
                <div className="ml-auto flex gap-0.5">
                  {[...Array(5)].map((_, j) => <Star key={j} className="h-3.5 w-3.5 fill-accent text-accent" />)}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Ace AI Tutor spotlight */}
      <section className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          viewport={{ once: true, margin: "-60px" }}
          className="mx-auto max-w-3xl rounded-2xl border border-secondary/20 bg-gradient-to-br from-secondary/5 via-card to-primary/5 p-8 md:p-10"
        >
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-secondary/10">
              <GraduationCap className="h-7 w-7 text-secondary" />
            </div>
            <div className="text-center md:text-left flex-1">
              <h3 className="font-display text-xl font-bold text-foreground mb-1">Meet Ace — Your AI SAT Tutor</h3>
              <p className="text-sm text-muted-foreground">
                Get instant explanations, study tips, and step-by-step help on any SAT topic. Free users get 5 messages/day — Premium gets unlimited access.
              </p>
            </div>
            <Button className="shrink-0 bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={() => {
              const aceBtn = document.querySelector('[aria-label="Ask Ace"]') as HTMLButtonElement;
              if (aceBtn) aceBtn.click();
            }}>
              Try Ace <GraduationCap className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Premium teaser */}
      <section className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          viewport={{ once: true, margin: "-60px" }}
          className="mx-auto max-w-3xl rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-secondary/5 p-8 md:p-10"
        >
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
              <Crown className="h-7 w-7 text-primary" />
            </div>
            <div className="text-center md:text-left flex-1">
              <h3 className="font-display text-xl font-bold text-foreground mb-1">Unlock everything with Premium</h3>
              <p className="text-sm text-muted-foreground">
                Unlimited questions, unlimited Ace AI messages, SAT Score Calculator, past daily questions, and priority support — all at just $5.99/mo.
              </p>
            </div>
            <Button className="shrink-0" asChild>
              <Link to="/pricing">
                View Plans <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          viewport={{ once: true, margin: "-60px" }}
          className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-secondary/5 p-10 text-center md:p-16"
        >
          {/* Subtle glow blobs */}
          <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-primary/10 blur-[80px] pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-secondary/10 blur-[60px] pointer-events-none" />

          <div className="relative">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1e3a8a]">
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
            <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
              Your best score is <span className="text-gradient">one click away</span>
            </h2>
            <p className="mx-auto mt-4 max-w-md text-muted-foreground">
              Join thousands of students already improving their SAT scores with ClutchSAT. Free to start, no credit card needed.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" className="gradient-primary text-primary-foreground shadow-glow px-8 h-12 text-base font-semibold" asChild>
                <Link to="/signup">
                  Create Free Account <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base h-12 px-6" asChild>
                <Link to="/practice">Try a Question</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </section>
    </Layout>
  );
};

export default Index;
