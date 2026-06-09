import { useState, useCallback } from "react";
import { Loader2, Trash2, Check, X, Plus, AlertCircle, Edit2, Save, Upload, Pin, Lock, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import MathText from "@/components/MathText";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { SAT_HIERARCHY, MATH_SUBSECTIONS, ENGLISH_SUBSECTIONS, getSubSubsections } from "@/lib/satStructure";

// Image upload component for question media
const QuestionMediaManager = ({ questionId }: { questionId: string }) => {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [captionEditing, setCaptionEditing] = useState<string | null>(null);
  const [captionText, setCaptionText] = useState("");

  const { data: media = [] } = useQuery({
    queryKey: ["question_media", questionId],
    queryFn: async () => {
      const { data, error } = await supabase.from("question_media").select("*").eq("question_id", questionId).order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split(".").pop();
      const path = `${questionId}/${Date.now()}-${i}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("question-images").upload(path, file);
      if (uploadError) { toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" }); continue; }
      // Store just the path, not the full public URL
      await supabase.from("question_media").insert({
        question_id: questionId,
        media_url: path,
        media_type: "image",
        display_order: media.length + i,
      });
    }
    queryClient.invalidateQueries({ queryKey: ["question_media", questionId] });
    setUploading(false);
    toast({ title: "Image(s) uploaded" });
    e.target.value = "";
  };

  const deleteMedia = async (id: string) => {
    await supabase.from("question_media").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["question_media", questionId] });
    toast({ title: "Image deleted" });
  };

  const saveCaption = async (id: string) => {
    await supabase.from("question_media").update({ caption: captionText || null }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["question_media", questionId] });
    setCaptionEditing(null);
    toast({ title: "Caption saved" });
  };

  const moveMedia = async (id: string, direction: "up" | "down") => {
    const idx = media.findIndex((m) => m.id === id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= media.length) return;
    await Promise.all([
      supabase.from("question_media").update({ display_order: swapIdx }).eq("id", media[idx].id),
      supabase.from("question_media").update({ display_order: idx }).eq("id", media[swapIdx].id),
    ]);
    queryClient.invalidateQueries({ queryKey: ["question_media", questionId] });
  };

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-primary" /> Images / Media
        </h4>
        <label className="cursor-pointer">
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors cursor-pointer">
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {uploading ? "Uploading..." : "Add Image"}
          </span>
        </label>
      </div>
      {media.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-3">No images attached. Click "Add Image" to upload.</p>
      )}
      {media.length > 0 && (
        <div className="space-y-2">
          {media.map((m, idx) => (
            <div key={m.id} className="flex items-start gap-3 rounded-lg border border-border bg-card p-2">
              <img src={m.media_url} alt={m.caption || ""} className="h-20 w-20 object-cover rounded-lg border border-border shrink-0" />
              <div className="flex-1 min-w-0 space-y-1">
                {captionEditing === m.id ? (
                  <div className="flex gap-1">
                    <Input value={captionText} onChange={(e) => setCaptionText(e.target.value)} placeholder="Caption..." className="text-xs h-7" />
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => saveCaption(m.id)}><Check className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setCaptionEditing(null)}><X className="h-3 w-3" /></Button>
                  </div>
                ) : (
                  <button onClick={() => { setCaptionEditing(m.id); setCaptionText(m.caption || ""); }} className="text-xs text-muted-foreground hover:text-foreground">
                    {m.caption || "Click to add caption..."}
                  </button>
                )}
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs" disabled={idx === 0} onClick={() => moveMedia(m.id, "up")}>↑</Button>
                  <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs" disabled={idx === media.length - 1} onClick={() => moveMedia(m.id, "down")}>↓</Button>
                  <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs text-destructive" onClick={() => deleteMedia(m.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const QuestionForm = ({ form, onChange, onSave, onCancel, saveLabel, questionId }: {
  form: any;
  onChange: (field: string, value: any) => void;
  onSave: () => void;
  onCancel: () => void;
  saveLabel: string;
  questionId?: string;
}) => {
  const subsOpts = form.subject === "Math" ? MATH_SUBSECTIONS : ENGLISH_SUBSECTIONS;
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Select value={form.subject} onValueChange={(v) => onChange("subject", v)}>
          <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
          <SelectContent><SelectItem value="Math">Math</SelectItem><SelectItem value="English">English</SelectItem></SelectContent>
        </Select>
        <Select value={form.subsection || ""} onValueChange={(v) => { onChange("subsection", v); onChange("sub_subsection", ""); }}>
          <SelectTrigger><SelectValue placeholder="Subsection" /></SelectTrigger>
          <SelectContent>{subsOpts.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={form.sub_subsection || ""} onValueChange={(v) => onChange("sub_subsection", v)}>
          <SelectTrigger><SelectValue placeholder="Sub-subsection" /></SelectTrigger>
          <SelectContent>
            {getSubSubsections(form.subsection || "").map((ss: string) => <SelectItem key={ss} value={ss}>{ss}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={form.difficulty} onValueChange={(v) => onChange("difficulty", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="Easy">Easy</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="Hard">Hard</SelectItem></SelectContent>
        </Select>
        <Select value={form.question_type} onValueChange={(v) => onChange("question_type", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="multiple-choice">Multiple Choice</SelectItem><SelectItem value="grid-in">Grid-In</SelectItem></SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Passage / Context (optional — for reading passages or math context)</label>
        <Textarea value={form.passage} onChange={(e) => onChange("passage", e.target.value)} placeholder="Optional passage or context..." rows={3} />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Question text (use $...$ for math: $x^2$, $\frac&#123;1&#125;&#123;2&#125;$)</label>
        <Textarea value={form.question_text} onChange={(e) => onChange("question_text", e.target.value)} placeholder="Question text" />
      </div>
      {form.question_text && (
        <div className="rounded-lg bg-muted/50 p-3 text-sm">
          <span className="text-xs text-muted-foreground block mb-1">Preview:</span>
          <MathText text={form.question_text} />
        </div>
      )}
      {form.question_type === "multiple-choice" ? (
        <div className="space-y-2">
          {(form.options || []).map((opt: string, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <input type="radio" checked={form.correct_answer === i} onChange={() => onChange("correct_answer", i)} className="accent-primary" />
              <Input value={opt} onChange={(e) => {
                const o = [...(form.options || [])];
                o[i] = e.target.value;
                onChange("options", o);
              }} placeholder={`Option ${i + 1}`} />
            </div>
          ))}
        </div>
      ) : (
        <Input value={form.correct_answer_numeric} onChange={(e) => onChange("correct_answer_numeric", e.target.value)} placeholder="Correct numeric answer (e.g. 3.14, 1/3)" type="text" inputMode="decimal" />
      )}
      <div>
        <label className="text-xs text-muted-foreground">Explanation</label>
        <Textarea value={form.explanation} onChange={(e) => onChange("explanation", e.target.value)} placeholder="Explanation" />
      </div>

      {/* Images section - only for existing questions */}
      {questionId && <QuestionMediaManager questionId={questionId} />}
      {!questionId && (
        <p className="text-xs text-muted-foreground italic">💡 Save the question first, then edit it to add images.</p>
      )}

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button className="gradient-primary text-primary-foreground" onClick={onSave}><Save className="mr-1 h-4 w-4" /> {saveLabel}</Button>
      </div>
    </div>
  );
};

const Admin = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingQ, setEditingQ] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [showAddQ, setShowAddQ] = useState(false);
  const [showAddFC, setShowAddFC] = useState(false);
  const [editingFC, setEditingFC] = useState<string | null>(null);
  const [editFCForm, setEditFCForm] = useState<any>({});

  const [newQ, setNewQ] = useState({ subject: "Math", subsection: "", sub_subsection: "", difficulty: "Medium", question_text: "", options: ["", "", "", ""], correct_answer: 0, explanation: "", passage: "", question_type: "multiple-choice", correct_answer_numeric: "" });
  const [newFC, setNewFC] = useState({ term: "", definition: "", category: "Vocabulary", difficulty: "Medium" });

  const { data: isAdmin, isLoading: checkingRole } = useQuery({
    queryKey: ["is_admin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_role", { _user_id: user!.id, _role: "admin" });
      if (error) throw error;
      return data as boolean;
    },
  });

  const { data: questions = [], isLoading: loadingQ } = useQuery({
    queryKey: ["admin_questions"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("questions").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: pendingQuestions = [], isLoading: loadingPending } = useQuery({
    queryKey: ["pending_community"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("community_questions").select("*").eq("status", "pending").order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: flashcards = [], isLoading: loadingFC } = useQuery({
    queryKey: ["admin_flashcards"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("flashcards").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: forumThreads = [], isLoading: loadingForumThreads } = useQuery({
    queryKey: ["admin_forum_threads"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("forum_threads").select("*, profiles!forum_threads_user_id_fkey(username)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteQuestion = async (id: string) => {
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (error) {
      toast({ title: "Access denied", description: "You don't have permission to perform this action.", variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["admin_questions"] });
    toast({ title: "Deleted" });
  };

  const deleteFlashcard = async (id: string) => {
    const { error } = await supabase.from("flashcards").delete().eq("id", id);
    if (error) {
      toast({ title: "Access denied", description: "You don't have permission to perform this action.", variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["admin_flashcards"] });
    toast({ title: "Deleted" });
  };

  const startEditQ = (q: any) => {
    setEditingQ(q.id);
    setEditForm({
      subject: q.subject, subsection: q.subsection || "", sub_subsection: q.sub_subsection || "",
      difficulty: q.difficulty || "Medium",
      question_text: q.question_text, options: Array.isArray(q.options) ? [...q.options] : ["", "", "", ""],
      correct_answer: q.correct_answer, explanation: q.explanation, passage: q.passage || "",
      question_type: q.question_type || "multiple-choice", correct_answer_numeric: q.correct_answer_numeric?.toString() || "",
    });
  };

  const handleEditFormChange = useCallback((field: string, value: any) => {
    setEditForm((prev: any) => {
      if (field === "subject") return { ...prev, subject: value, subsection: "", sub_subsection: "" };
      if (field === "subsection") return { ...prev, subsection: value, sub_subsection: "" };
      return { ...prev, [field]: value };
    });
  }, []);

  const handleNewQChange = useCallback((field: string, value: any) => {
    setNewQ((prev) => {
      if (field === "subject") return { ...prev, subject: value, subsection: "", sub_subsection: "" };
      if (field === "subsection") return { ...prev, subsection: value, sub_subsection: "" };
      return { ...prev, [field]: value };
    });
  }, []);

  const saveEditQ = async () => {
    if (!editingQ) return;
    const { error } = await supabase.from("questions").update({
      subject: editForm.subject, subsection: editForm.subsection || null,
      sub_subsection: editForm.sub_subsection || null, difficulty: editForm.difficulty,
      question_text: editForm.question_text, options: editForm.options,
      correct_answer: editForm.correct_answer, explanation: editForm.explanation,
      passage: editForm.passage || null, question_type: editForm.question_type,
      correct_answer_numeric: editForm.correct_answer_numeric ? parseFloat(editForm.correct_answer_numeric) : null,
    }).eq("id", editingQ);
    if (error) { toast({ title: "Error", variant: "destructive" }); return; }
    setEditingQ(null);
    queryClient.invalidateQueries({ queryKey: ["admin_questions"] });
    toast({ title: "Question updated" });
  };

  const addQuestion = async () => {
    const { error } = await supabase.from("questions").insert({
      subject: newQ.subject, subsection: newQ.subsection || null,
      sub_subsection: newQ.sub_subsection || null, difficulty: newQ.difficulty,
      question_text: newQ.question_text, options: newQ.options,
      correct_answer: newQ.correct_answer, explanation: newQ.explanation,
      passage: newQ.passage || null, question_type: newQ.question_type,
      correct_answer_numeric: newQ.correct_answer_numeric ? parseFloat(newQ.correct_answer_numeric) : null,
    });
    if (error) { toast({ title: "Error", variant: "destructive" }); return; }
    setShowAddQ(false);
    setNewQ({ subject: "Math", subsection: "", sub_subsection: "", difficulty: "Medium", question_text: "", options: ["", "", "", ""], correct_answer: 0, explanation: "", passage: "", question_type: "multiple-choice", correct_answer_numeric: "" });
    queryClient.invalidateQueries({ queryKey: ["admin_questions"] });
    toast({ title: "Question added!" });
  };

  const startEditFC = (fc: any) => {
    setEditingFC(fc.id);
    setEditFCForm({ term: fc.term, definition: fc.definition, category: fc.category, difficulty: fc.difficulty || "Medium" });
  };

  const saveEditFC = async () => {
    if (!editingFC) return;
    const { error } = await supabase.from("flashcards").update(editFCForm).eq("id", editingFC);
    if (error) { toast({ title: "Access denied", variant: "destructive" }); return; }
    setEditingFC(null);
    queryClient.invalidateQueries({ queryKey: ["admin_flashcards"] });
    toast({ title: "Flashcard updated" });
  };

  const addFlashcard = async () => {
    const { error } = await supabase.from("flashcards").insert(newFC);
    if (error) { toast({ title: "Access denied", variant: "destructive" }); return; }
    setShowAddFC(false);
    setNewFC({ term: "", definition: "", category: "Vocabulary", difficulty: "Medium" });
    queryClient.invalidateQueries({ queryKey: ["admin_flashcards"] });
    toast({ title: "Flashcard added!" });
  };

  const approveQuestion = async (cq: any) => {
    const { error } = await supabase.from("questions").insert({
      subject: cq.subject, subsection: cq.subsection, sub_subsection: cq.sub_subsection,
      difficulty: cq.difficulty, question_text: cq.question_text, options: cq.options,
      correct_answer: cq.correct_answer, explanation: cq.explanation, passage: cq.passage,
    });
    if (error) { toast({ title: "Error", variant: "destructive" }); return; }
    await supabase.from("community_questions").update({ status: "approved" }).eq("id", cq.id);
    queryClient.invalidateQueries({ queryKey: ["pending_community"] });
    queryClient.invalidateQueries({ queryKey: ["admin_questions"] });
    toast({ title: "Question approved!" });
  };

  const rejectQuestion = async (id: string) => {
    await supabase.from("community_questions").update({ status: "rejected" }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["pending_community"] });
    toast({ title: "Question rejected" });
  };

  const togglePin = async (id: string, current: boolean) => {
    await supabase.from("forum_threads").update({ is_pinned: !current }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin_forum_threads"] });
    queryClient.invalidateQueries({ queryKey: ["forum_threads"] });
    toast({ title: current ? "Unpinned" : "Pinned" });
  };

  const toggleLock = async (id: string, current: boolean) => {
    await supabase.from("forum_threads").update({ is_locked: !current }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin_forum_threads"] });
    queryClient.invalidateQueries({ queryKey: ["forum_threads"] });
    toast({ title: current ? "Unlocked" : "Locked" });
  };

  const deleteForumThread = async (id: string) => {
    await supabase.from("forum_threads").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin_forum_threads"] });
    queryClient.invalidateQueries({ queryKey: ["forum_threads"] });
    toast({ title: "Thread deleted" });
  };

  if (checkingRole) return <Layout><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></Layout>;
  if (!user || !isAdmin) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don't have admin privileges.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-10">
        <h1 className="font-display text-3xl font-bold text-foreground mb-8">Admin Panel</h1>

        <Tabs defaultValue="questions">
          <TabsList className="mb-6">
            <TabsTrigger value="questions">Questions ({questions.length})</TabsTrigger>
            <TabsTrigger value="pending" className="relative">
              Community
              {pendingQuestions.length > 0 && (
                <Badge variant="destructive" className="ml-1.5 h-5 w-5 p-0 flex items-center justify-center text-xs">{pendingQuestions.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="flashcards">Flashcards ({flashcards.length})</TabsTrigger>
            <TabsTrigger value="forum">Forum ({forumThreads.length})</TabsTrigger>
          </TabsList>

          {/* QUESTIONS TAB */}
          <TabsContent value="questions">
            <div className="mb-4">
              <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => setShowAddQ(!showAddQ)}>
                <Plus className="mr-1 h-4 w-4" /> Add Question
              </Button>
            </div>
            {showAddQ && (
              <div className="mb-4">
                <QuestionForm form={newQ} onChange={handleNewQChange} onSave={addQuestion} onCancel={() => setShowAddQ(false)} saveLabel="Add" />
              </div>
            )}
            {loadingQ ? <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /> : (
              <div className="space-y-2">
                {questions.map((q) => (
                  <div key={q.id}>
                    {editingQ === q.id ? (
                      <QuestionForm form={editForm} onChange={handleEditFormChange} onSave={saveEditQ} onCancel={() => setEditingQ(null)} saveLabel="Save" questionId={q.id} />
                    ) : (
                      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-primary">{q.subject}</span>
                            <span className="text-xs text-muted-foreground">{q.subsection}</span>
                            {q.sub_subsection && <span className="text-xs text-muted-foreground/70">› {q.sub_subsection}</span>}
                            <span className="text-xs text-muted-foreground">• {q.difficulty}</span>
                            {q.question_type === "grid-in" && <span className="text-xs text-secondary">Grid-In</span>}
                          </div>
                          <p className="text-sm text-foreground truncate">{q.question_text}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="sm" onClick={() => startEditQ(q)}><Edit2 className="h-4 w-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Delete question?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteQuestion(q.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* PENDING TAB */}
          <TabsContent value="pending">
            {loadingPending ? <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /> : pendingQuestions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No pending submissions.</p>
            ) : (
              <div className="space-y-4">
                {pendingQuestions.map((cq) => (
                  <div key={cq.id} className="rounded-xl border border-border bg-card p-5 shadow-card">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-primary">{cq.subject}</span>
                      <span className="text-xs text-muted-foreground">{cq.subsection} • {cq.difficulty}</span>
                      {cq.sub_subsection && <span className="text-xs text-muted-foreground/70">› {cq.sub_subsection}</span>}
                    </div>
                    {cq.passage && <div className="rounded-lg bg-muted/50 p-3 mb-3 text-sm text-foreground whitespace-pre-wrap">{cq.passage}</div>}
                    <p className="text-sm font-medium text-foreground mb-2"><MathText text={cq.question_text} /></p>
                    <div className="grid gap-1 sm:grid-cols-2 mb-2">
                      {(Array.isArray(cq.options) ? cq.options : []).map((opt: string, i: number) => (
                        <div key={i} className={`text-xs px-3 py-1.5 rounded ${i === cq.correct_answer ? "bg-success/10 text-success font-medium" : "text-muted-foreground"}`}>
                          {i === cq.correct_answer ? "✓ " : ""}<MathText text={opt} />
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mb-3"><strong>Explanation:</strong> {cq.explanation}</p>
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="outline" onClick={() => rejectQuestion(cq.id)} className="text-destructive">
                        <X className="mr-1 h-3 w-3" /> Reject
                      </Button>
                      <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => approveQuestion(cq)}>
                        <Check className="mr-1 h-3 w-3" /> Approve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* FLASHCARDS TAB */}
          <TabsContent value="flashcards">
            <div className="mb-4">
              <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => setShowAddFC(!showAddFC)}>
                <Plus className="mr-1 h-4 w-4" /> Add Flashcard
              </Button>
            </div>
            {showAddFC && (
              <div className="mb-4 space-y-3 rounded-2xl border border-border bg-card p-5 shadow-card">
                <Input value={newFC.term} onChange={(e) => setNewFC({ ...newFC, term: e.target.value })} placeholder="Term" />
                <Textarea value={newFC.definition} onChange={(e) => setNewFC({ ...newFC, definition: e.target.value })} placeholder="Definition" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select value={newFC.category} onValueChange={(v) => setNewFC({ ...newFC, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Vocabulary">Vocabulary</SelectItem><SelectItem value="Math Formula">Math Formula</SelectItem></SelectContent>
                  </Select>
                  <Select value={newFC.difficulty} onValueChange={(v) => setNewFC({ ...newFC, difficulty: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Easy">Easy</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="Hard">Hard</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowAddFC(false)}>Cancel</Button>
                  <Button className="gradient-primary text-primary-foreground" onClick={addFlashcard}>Add</Button>
                </div>
              </div>
            )}
            {loadingFC ? <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /> : (
              <div className="space-y-2">
                {flashcards.map((fc) => (
                  <div key={fc.id}>
                    {editingFC === fc.id ? (
                      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                        <Input value={editFCForm.term} onChange={(e) => setEditFCForm({ ...editFCForm, term: e.target.value })} />
                        <Textarea value={editFCForm.definition} onChange={(e) => setEditFCForm({ ...editFCForm, definition: e.target.value })} />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Select value={editFCForm.category} onValueChange={(v) => setEditFCForm({ ...editFCForm, category: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="Vocabulary">Vocabulary</SelectItem><SelectItem value="Math Formula">Math Formula</SelectItem></SelectContent>
                          </Select>
                          <Select value={editFCForm.difficulty} onValueChange={(v) => setEditFCForm({ ...editFCForm, difficulty: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="Easy">Easy</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="Hard">Hard</SelectItem></SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" onClick={() => setEditingFC(null)}>Cancel</Button>
                          <Button className="gradient-primary text-primary-foreground" onClick={saveEditFC}>Save</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{fc.category}</span>
                            <span className="text-xs text-muted-foreground">• {fc.difficulty}</span>
                          </div>
                          <p className="text-sm font-medium text-foreground">{fc.term}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="sm" onClick={() => startEditFC(fc)}><Edit2 className="h-4 w-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Delete flashcard?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteFlashcard(fc.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* FORUM MANAGEMENT TAB */}
          <TabsContent value="forum">
            {loadingForumThreads ? <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /> : forumThreads.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No forum threads.</p>
            ) : (
              <div className="space-y-2">
                {forumThreads.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {t.is_pinned && <span className="text-xs text-primary font-medium">📌</span>}
                        {t.is_locked && <span className="text-xs text-destructive font-medium">🔒</span>}
                        <h3 className="text-sm font-medium text-foreground truncate">{t.title}</h3>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{t.profiles?.username || "Anonymous"}</span>
                        <span>•</span>
                        <span>{new Date(t.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => togglePin(t.id, !!t.is_pinned)} title={t.is_pinned ? "Unpin" : "Pin"}>
                        <Pin className={`h-4 w-4 ${t.is_pinned ? "text-primary" : ""}`} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleLock(t.id, !!t.is_locked)} title={t.is_locked ? "Unlock" : "Lock"}>
                        <Lock className={`h-4 w-4 ${t.is_locked ? "text-destructive" : ""}`} />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete thread?</AlertDialogTitle><AlertDialogDescription>This will also delete all replies.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteForumThread(t.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Admin;
