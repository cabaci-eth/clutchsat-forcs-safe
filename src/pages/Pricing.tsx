import { useState } from "react";
import { Check, Crown, GraduationCap, BookOpen, Brain, CalendarDays, BarChart3, MessageSquare, Shield, Clock, Infinity, ArrowRight, Star, Bot, FileText } from "lucide-react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

const freeFeatures = [
  { text: "Limited practice questions", included: true },
  { text: "Smart flashcards", included: true },
  { text: "Personalized study plan", included: true },
  { text: "Progress dashboard", included: true },
  { text: "Community forum", included: true },
  { text: "Daily question", included: true },
  { text: "Ace AI tutor (5 messages/day)", included: true },
  { text: "1 full-length mock test", included: true },
  { text: "Unlimited questions & quizzes", included: false },
  { text: "Unlimited Ace AI messages", included: false },
  { text: "All mock tests", included: false },
  { text: "SAT Score Calculator", included: false },
  { text: "Priority support", included: false },
];

const premiumFeatures = [
  { text: "Everything in Free", included: true },
  { text: "Unlimited questions & quizzes", included: true },
  { text: "Unlimited Ace AI messages", included: true },
  { text: "All full-length mock tests", included: true },
  { text: "Unlimited flashcards", included: true },
  { text: "SAT Score Calculator", included: true },
  { text: "Unlock past daily questions", included: true },
  { text: "Priority support", included: true },
  { text: "All future premium features", included: true },
];

const stats = [
  { value: "2,000+", label: "Practice Questions" },
  { value: "500+", label: "Flashcards" },
  { value: "97.86%", label: "Student Satisfaction" },
  { value: "150+", label: "Point Avg. Improvement" },
];

const faqs = [
  {
    q: "What is Ace AI?",
    a: "Ace is your built-in AI SAT tutor. Ask it anything — math concepts, reading strategies, grammar rules, or help with a specific question. Free users get 5 messages per day, Premium users get unlimited access.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes! Cancel anytime from your account. You'll keep access until the end of your billing period.",
  },
  {
    q: "Is there a free trial?",
    a: "The Free plan lets you explore core features with no time limit, including 5 daily Ace AI messages. Upgrade when you're ready.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit/debit cards through Stripe's secure payment processing.",
  },
  {
    q: "Will I be charged immediately?",
    a: "Yes, your first billing cycle starts immediately. You get instant access to all Premium features.",
  },
];

const Pricing = () => {
  const { user } = useAuth();
  const { data: sub } = useSubscription();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleManage = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const isPremium = sub?.subscribed;

  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="container mx-auto max-w-5xl px-4 py-16 md:py-24 text-center relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Badge className="mb-5 bg-primary/10 text-primary border-primary/20 text-sm px-4 py-1.5">
              <GraduationCap className="w-3.5 h-3.5 mr-1.5" /> Simple, transparent pricing
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
              Invest in your{" "}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                SAT success
              </span>
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              Join thousands of students scoring higher. Start free, then unlock the full
              arsenal when you're ready to go all-in.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-b border-border bg-muted/30">
        <div className="container mx-auto max-w-4xl px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
              >
                <p className="text-2xl md:text-3xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="container mx-auto max-w-5xl px-4 py-16">
        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* Free */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
            <Card className="h-full border-border/60 bg-card">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1e3a8a]">
                    <GraduationCap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Free</h3>
                    <p className="text-xs text-muted-foreground">Get started, no card needed</p>
                  </div>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold tracking-tight">$0</span>
                  <span className="text-muted-foreground text-sm">/month</span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="border-t border-border pt-5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">What's included</p>
                  <ul className="space-y-3">
                    {freeFeatures.map((f) => (
                      <li key={f.text} className={`flex items-start gap-2.5 text-sm ${!f.included ? "text-muted-foreground/50" : ""}`}>
                        {f.included ? (
                          <Check className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                        ) : (
                          <span className="w-4 h-4 mt-0.5 shrink-0 flex items-center justify-center text-muted-foreground/30">—</span>
                        )}
                        <span className={!f.included ? "line-through" : ""}>{f.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Button variant="outline" className="w-full mt-8 h-12" disabled={!user} asChild={!user ? false : undefined}>
                  {user ? "Current Plan" : <span>Sign up free <ArrowRight className="w-4 h-4 ml-1" /></span>}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Premium */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <Card className="h-full border-primary/30 shadow-xl shadow-primary/5 relative overflow-hidden bg-card">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-primary/80 to-primary/50" />
              <div className="absolute top-3 right-3">
                <Badge className="bg-primary text-primary-foreground border-0 text-xs px-2.5 py-1">
                  <Star className="w-3 h-3 mr-1 fill-current" /> MOST POPULAR
                </Badge>
              </div>
              <CardHeader className="pb-4 pt-8">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Crown className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Premium</h3>
                    <p className="text-xs text-muted-foreground">Everything you need to ace the SAT</p>
                  </div>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold tracking-tight">$5.99</span>
                  <span className="text-muted-foreground text-sm">/month</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Less than a coffee a week ☕</p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="border-t border-primary/10 pt-5">
                  <p className="text-xs font-medium text-primary uppercase tracking-wider mb-4">Everything included</p>
                  <ul className="space-y-3">
                    {premiumFeatures.map((f) => (
                      <li key={f.text} className="flex items-start gap-2.5 text-sm">
                        <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <span className="font-medium">{f.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {isPremium ? (
                  <Button className="w-full mt-8 h-12" variant="outline" onClick={handleManage} disabled={loading}>
                    Manage Subscription
                  </Button>
                ) : (
                  <Button className="w-full mt-8 h-12 text-base font-semibold shadow-lg shadow-primary/20" onClick={handleSubscribe} disabled={loading}>
                    {loading ? "Loading…" : (
                      <>Get Premium <ArrowRight className="w-4 h-4 ml-1" /></>
                    )}
                  </Button>
                )}
                <p className="text-center text-xs text-muted-foreground mt-3">
                  Cancel anytime · Secure payment via Stripe
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* What Premium unlocks — detailed breakdown */}
      <section className="border-t border-border bg-muted/20">
        <div className="container mx-auto max-w-5xl px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Why students love Premium</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Every tool you need to maximize your score, all in one place.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Infinity, title: "Unlimited Practice", desc: "Access every question in our database. No daily limits, no restrictions." },
              { icon: GraduationCap, title: "Unlimited Ace AI", desc: "Ask Ace anything, anytime. Unlimited AI tutor messages to explain concepts and guide your study." },
              { icon: BarChart3, title: "SAT Score Calculator", desc: "Predict your score with our advanced calculator tuned to real SAT curves." },
              { icon: Clock, title: "Past Daily Questions", desc: "Review every past daily question and explanation. Never miss a learning moment." },
              { icon: Brain, title: "Full Flashcard Library", desc: "Unlimited flashcard reviews with spaced repetition for lasting retention." },
              { icon: Shield, title: "Priority Support", desc: "Get help faster when you're stuck. Your questions get answered first." },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="group rounded-xl border border-border bg-card p-5 hover:border-primary/20 hover:shadow-md transition-all"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-3 group-hover:bg-primary/15 transition-colors">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border">
        <div className="container mx-auto max-w-3xl px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Frequently asked questions</h2>
          </motion.div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border bg-card p-5"
              >
                <h3 className="font-semibold text-foreground mb-1.5">{faq.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container mx-auto max-w-3xl px-4 py-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Crown className="w-10 h-10 text-primary mx-auto mb-4" />
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              Ready to crush the SAT?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              For less than the price of a single SAT prep book, get unlimited access to
              every tool you need.
            </p>
            {isPremium ? (
              <Button size="lg" variant="outline" onClick={handleManage} disabled={loading} className="h-12 px-8">
                Manage Your Subscription
              </Button>
            ) : (
              <Button size="lg" onClick={handleSubscribe} disabled={loading} className="h-12 px-8 text-base font-semibold shadow-lg shadow-primary/20">
                {loading ? "Loading…" : (
                  <>Get Premium for $5.99/mo <ArrowRight className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            )}
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Pricing;
