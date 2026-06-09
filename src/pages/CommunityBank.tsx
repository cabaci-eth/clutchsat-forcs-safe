import { useState } from "react";
import { Plus, Loader2, CheckCircle, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { SAT_HIERARCHY, MATH_SUBSECTIONS, ENGLISH_SUBSECTIONS, getSubSubsections, isEnglish } from "@/lib/satStructure";

const statusIcons: Record<string, typeof Clock> = { pending: Clock, approved: CheckCircle, rejected: XCircle };
const statusColors: Record<string, string> = {
  pending: "text-accent-foreground bg-accent/10",
  approved: "text-success bg-success/10",
  rejected: "text-destructive bg-destructive/10",
};

const CommunityBank = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [subject, setSubject] = useState("Math");
  const [subsection, setSubsection] = useState("");
  const [subSubsection, setSubSubsection] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [explanation, setExplanation] = useState("");
  const [passage, setPassage] = useState("");

  const { data: mySubmissions = [], isLoading } = useQuery({
    queryKey: ["community_questions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_questions")
        .select("*")
        .eq("submitted_by", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const resetForm = () => {
    setQuestionText("");
    setOptions(["", "", "", ""]);
    setCorrectAnswer(0);
    setExplanation("");
    setPassage("");
    setSubsection("");
    setSubSubsection("");
  };

  const handleSubmit = async () => {
    if (!user || !questionText.trim() || options.some((o) => !o.trim()) || !explanation.trim() || !subsection) {
      toast({ title: "Missing fields", description: "Please fill in all required fields including subsection.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const mappedSubject = isEnglish(subject) ? "English" : "Math";
    const { error } = await supabase.from("community_questions").insert({
      subject: mappedSubject,
      subsection: subsection || null,
      sub_subsection: subSubsection || null,
      difficulty,
      question_text: questionText,
      options,
      correct_answer: correctAnswer,
      explanation,
      passage: passage || null,
      submitted_by: user.id,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Error", description: "Failed to submit question.", variant: "destructive" });
    } else {
      toast({ title: "Submitted!", description: "Your question is pending review." });
      resetForm();
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["community_questions"] });
    }
  };

  const subsectionOptions = subject === "Math" ? MATH_SUBSECTIONS : ENGLISH_SUBSECTIONS;
  const subSubsectionOptions = getSubSubsections(subsection);

  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="font-display text-3xl font-bold text-foreground mb-4">Community Question Bank</h1>
          <p className="text-muted-foreground mb-6">Sign in to submit your own SAT questions.</p>
          <Button className="gradient-primary text-primary-foreground" asChild>
            <Link to="/login">Sign In</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Community Bank</h1>
            <p className="mt-2 text-muted-foreground">Submit your own SAT questions for the community.</p>
          </div>
          <Button className="gradient-primary text-primary-foreground" onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-1 h-4 w-4" /> Submit Question
          </Button>
        </div>

        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-6 shadow-card mb-8 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-foreground">Subject *</label>
                <Select value={subject} onValueChange={(v) => { setSubject(v); setSubsection(""); setSubSubsection(""); }}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Math">Math</SelectItem>
                    <SelectItem value="English">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Difficulty *</label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Easy">Easy</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-foreground">Subsection *</label>
                <Select value={subsection} onValueChange={(v) => { setSubsection(v); setSubSubsection(""); }}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select subsection..." /></SelectTrigger>
                  <SelectContent>
                    {subsectionOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Sub-subsection *</label>
                <Select value={subSubsection} onValueChange={setSubSubsection} disabled={!subsection}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder={subsection ? "Select..." : "Choose subsection first"} /></SelectTrigger>
                  <SelectContent>
                    {subSubsectionOptions.map((ss) => <SelectItem key={ss} value={ss}>{ss}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Context / Passage <span className="text-muted-foreground font-normal">(optional)</span></label>
              <Textarea className="mt-1" value={passage} onChange={(e) => setPassage(e.target.value)} placeholder="Enter reading passage or math context..." rows={4} />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Question Text *</label>
              <Textarea className="mt-1" value={questionText} onChange={(e) => setQuestionText(e.target.value)} placeholder="Enter question (use $...$ for math notation)..." />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Answer Options *</label>
              <div className="mt-1 space-y-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="radio" name="correct" checked={correctAnswer === i} onChange={() => setCorrectAnswer(i)} className="accent-primary" />
                    <Input value={opt} onChange={(e) => { const next = [...options]; next[i] = e.target.value; setOptions(next); }} placeholder={`Option ${i + 1}`} />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Select the radio button next to the correct answer.</p>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Explanation *</label>
              <Textarea className="mt-1" value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="Explain the correct answer..." />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="gradient-primary text-primary-foreground" onClick={handleSubmit} disabled={submitting}>
                {submitting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                Submit for Review
              </Button>
            </div>
          </motion.div>
        )}

        {/* My submissions */}
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">My Submissions</h2>
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : mySubmissions.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">You haven't submitted any questions yet.</p>
        ) : (
          <div className="space-y-3">
            {mySubmissions.map((q) => {
              const StatusIcon = statusIcons[q.status] || Clock;
              return (
                <div key={q.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-primary">{q.subject}</span>
                    {q.subsection && <span className="text-xs text-muted-foreground">{q.subsection}</span>}
                    {q.sub_subsection && <span className="text-xs text-muted-foreground/70">› {q.sub_subsection}</span>}
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[q.status]}`}>
                      <StatusIcon className="h-3 w-3" /> {q.status}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{q.question_text}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CommunityBank;
