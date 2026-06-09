import { useState, useEffect } from "react";
import { Plus, Trash2, Save, ChevronDown, ChevronUp, Edit2, GripVertical, Eye } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import Layout from "@/components/Layout";
import MathText from "@/components/MathText";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface MockTest {
  id: string;
  title: string;
  description: string | null;
  is_premium: boolean;
  order_index: number;
}

interface MockModule {
  id: string;
  test_id: string;
  module_name: string;
  module_order: number;
  time_limit_minutes: number;
  question_count: number;
}

interface MockQuestion {
  id: string;
  test_id: string;
  module_id: string;
  module_name: string;
  module_order: number;
  question_order: number;
  question_text: string;
  passage: string | null;
  options: string[];
  correct_answer: number;
  question_type: string;
  correct_answer_numeric: number | null;
  explanation: string;
  image_url: string | null;
}

const DeleteModuleSection = ({
  selectedTestId, modules, selectedModuleId, setSelectedModuleId,
  addDefaultModules, refetchModules, refetchQuestions,
}: {
  selectedTestId: string;
  modules: MockModule[] | undefined;
  selectedModuleId: string | null;
  setSelectedModuleId: (id: string | null) => void;
  addDefaultModules: (testId: string) => void;
  refetchModules: () => void;
  refetchQuestions: () => void;
}) => {
  const [deleteModuleId, setDeleteModuleId] = useState<string | null>(null);

  const handleDeleteModule = async () => {
    if (!deleteModuleId) return;
    await supabase.from("mock_test_questions").delete().eq("module_id", deleteModuleId);
    await supabase.from("mock_test_modules").delete().eq("id", deleteModuleId);
    if (selectedModuleId === deleteModuleId) setSelectedModuleId(null);
    setDeleteModuleId(null);
    refetchModules();
    refetchQuestions();
    toast({ title: "Module deleted" });
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-semibold text-foreground">Modules</h2>
        {!modules?.length && (
          <Button size="sm" variant="outline" onClick={() => addDefaultModules(selectedTestId)}>
            Add SAT Default Modules
          </Button>
        )}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {modules?.map((mod) => (
          <div
            key={mod.id}
            className={`rounded-xl border p-4 cursor-pointer transition-all ${
              selectedModuleId === mod.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/20"
            }`}
            onClick={() => setSelectedModuleId(mod.id)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{mod.module_name} — Module {mod.module_order}</p>
                <p className="text-xs text-muted-foreground">{mod.time_limit_minutes} min • {mod.question_count} questions</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:bg-destructive/10"
                onClick={(e) => { e.stopPropagation(); setDeleteModuleId(mod.id); }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <AlertDialog open={!!deleteModuleId} onOpenChange={() => setDeleteModuleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this module?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the module and all its questions. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteModule} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Module
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

  const MockTestAdmin = () => {
  const queryClient = useQueryClient();
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [editingTest, setEditingTest] = useState<Partial<MockTest> | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Partial<MockQuestion> | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const { data: tests, refetch: refetchTests } = useQuery({
    queryKey: ["admin-mock-tests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mock_tests").select("*").order("order_index");
      if (error) throw error;
      return data as MockTest[];
    },
  });

  const { data: modules, refetch: refetchModules } = useQuery({
    queryKey: ["admin-mock-modules", selectedTestId],
    enabled: !!selectedTestId,
    queryFn: async () => {
      const { data, error } = await supabase.from("mock_test_modules").select("*").eq("test_id", selectedTestId!).order("module_name", { ascending: false }).order("module_order");
      if (error) throw error;
      return data as MockModule[];
    },
  });

  const { data: questions, refetch: refetchQuestions } = useQuery({
    queryKey: ["admin-mock-questions", selectedModuleId],
    enabled: !!selectedModuleId,
    queryFn: async () => {
      const { data, error } = await supabase.from("mock_test_questions").select("*").eq("module_id", selectedModuleId!).order("question_order");
      if (error) throw error;
      return data as MockQuestion[];
    },
  });

  const saveTest = async () => {
    if (!editingTest) return;
    try {
      if (editingTest.id) {
        await supabase.from("mock_tests").update({
          title: editingTest.title,
          description: editingTest.description,
          is_premium: editingTest.is_premium,
          order_index: editingTest.order_index,
        }).eq("id", editingTest.id);
      } else {
        await supabase.from("mock_tests").insert({
          title: editingTest.title || "New Test",
          description: editingTest.description,
          is_premium: editingTest.is_premium ?? false,
          order_index: editingTest.order_index ?? (tests?.length ?? 0) + 1,
        });
      }
      setEditingTest(null);
      refetchTests();
      toast({ title: "Test saved" });
    } catch {
      toast({ title: "Error saving test", variant: "destructive" });
    }
  };

  const deleteTest = async (id: string) => {
    if (!confirm("Delete this test and all its modules/questions?")) return;
    await supabase.from("mock_tests").delete().eq("id", id);
    setSelectedTestId(null);
    refetchTests();
    toast({ title: "Test deleted" });
  };

  const addDefaultModules = async (testId: string) => {
    const defaultModules = [
      { test_id: testId, module_name: "Reading & Writing", module_order: 1, time_limit_minutes: 32, question_count: 27 },
      { test_id: testId, module_name: "Reading & Writing", module_order: 2, time_limit_minutes: 32, question_count: 27 },
      { test_id: testId, module_name: "Math", module_order: 1, time_limit_minutes: 35, question_count: 22 },
      { test_id: testId, module_name: "Math", module_order: 2, time_limit_minutes: 35, question_count: 22 },
    ];
    await supabase.from("mock_test_modules").insert(defaultModules);
    refetchModules();
    toast({ title: "4 default modules added" });
  };

  const saveQuestion = async () => {
    if (!editingQuestion || !selectedModuleId || !selectedTestId) return;
    const mod = modules?.find((m) => m.id === selectedModuleId);
    if (!mod) return;

    const qData = {
      test_id: selectedTestId,
      module_id: selectedModuleId,
      module_name: mod.module_name,
      module_order: mod.module_order,
      question_order: editingQuestion.question_order ?? (questions?.length ?? 0) + 1,
      question_text: editingQuestion.question_text || "",
      passage: editingQuestion.passage || null,
      options: editingQuestion.options || ["", "", "", ""],
      correct_answer: editingQuestion.correct_answer ?? 0,
      question_type: editingQuestion.question_type || "multiple-choice",
      correct_answer_numeric: editingQuestion.correct_answer_numeric ?? null,
      explanation: editingQuestion.explanation || "",
      image_url: editingQuestion.image_url || null,
    };

    try {
      if (editingQuestion.id) {
        await supabase.from("mock_test_questions").update(qData).eq("id", editingQuestion.id);
      } else {
        await supabase.from("mock_test_questions").insert(qData);
      }
      setEditingQuestion(null);
      refetchQuestions();
      toast({ title: "Question saved" });
    } catch {
      toast({ title: "Error saving question", variant: "destructive" });
    }
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm("Delete this question?")) return;
    await supabase.from("mock_test_questions").delete().eq("id", id);
    refetchQuestions();
  };

  return (
    <Layout>
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Mock Test Builder</h1>
            <p className="text-sm text-muted-foreground mt-1">Create and manage full-length practice tests</p>
          </div>
          <Button onClick={() => setEditingTest({ title: "", description: "", is_premium: false, order_index: (tests?.length ?? 0) + 1 })}>
            <Plus className="mr-1 h-4 w-4" /> New Test
          </Button>
        </div>

        {/* Test List */}
        <div className="space-y-3 mb-8">
          {tests?.map((t) => (
            <div
              key={t.id}
              className={`rounded-xl border p-4 transition-all cursor-pointer ${
                selectedTestId === t.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/20"
              }`}
              onClick={() => { setSelectedTestId(t.id); setSelectedModuleId(null); }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{t.title}</span>
                  {t.is_premium && <Badge variant="secondary" className="text-xs">Premium</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setEditingTest(t); }}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteTest(t.id); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modules */}
        {selectedTestId && (
          <DeleteModuleSection
            selectedTestId={selectedTestId}
            modules={modules}
            selectedModuleId={selectedModuleId}
            setSelectedModuleId={setSelectedModuleId}
            addDefaultModules={addDefaultModules}
            refetchModules={refetchModules}
            refetchQuestions={refetchQuestions}
          />
        )}

        {/* Questions */}
        {selectedModuleId && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-foreground">
                Questions ({questions?.length ?? 0})
              </h2>
              <Button size="sm" onClick={() => setEditingQuestion({
                question_text: "", passage: null, options: ["", "", "", ""],
                correct_answer: 0, question_type: "multiple-choice",
                correct_answer_numeric: null, explanation: "", image_url: null,
                question_order: (questions?.length ?? 0) + 1,
              })}>
                <Plus className="mr-1 h-4 w-4" /> Add Question
              </Button>
            </div>

            <div className="space-y-2">
              {questions?.map((q, i) => (
                <div key={q.id} className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-6">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{q.question_text.slice(0, 80)}...</p>
                    <p className="text-xs text-muted-foreground">{q.question_type} • Answer: {String.fromCharCode(65 + q.correct_answer)}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setEditingQuestion(q)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteQuestion(q.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Edit Test Dialog */}
        <Dialog open={!!editingTest} onOpenChange={() => setEditingTest(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTest?.id ? "Edit" : "New"} Test</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input value={editingTest?.title ?? ""} onChange={(e) => setEditingTest((p) => p ? { ...p, title: e.target.value } : p)} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={editingTest?.description ?? ""} onChange={(e) => setEditingTest((p) => p ? { ...p, description: e.target.value } : p)} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editingTest?.is_premium ?? false} onCheckedChange={(v) => setEditingTest((p) => p ? { ...p, is_premium: v } : p)} />
                <Label>Premium only</Label>
              </div>
              <div>
                <Label>Order</Label>
                <Input type="number" value={editingTest?.order_index ?? 1} onChange={(e) => setEditingTest((p) => p ? { ...p, order_index: Number(e.target.value) } : p)} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={saveTest}>
                <Save className="mr-1 h-4 w-4" /> Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Question Dialog */}
        <Dialog open={!!editingQuestion} onOpenChange={() => setEditingQuestion(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingQuestion?.id ? "Edit" : "New"} Question</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>Question Text (supports KaTeX)</Label>
                  <Button variant="ghost" size="sm" onClick={() => setShowPreview((p) => !p)}>
                    <Eye className="mr-1 h-3 w-3" /> {showPreview ? "Edit" : "Preview"}
                  </Button>
                </div>
                {showPreview ? (
                  <div className="rounded-lg border p-4 min-h-[80px]">
                    <MathText text={editingQuestion?.question_text ?? ""} />
                  </div>
                ) : (
                  <Textarea
                    rows={3}
                    value={editingQuestion?.question_text ?? ""}
                    onChange={(e) => setEditingQuestion((p) => p ? { ...p, question_text: e.target.value } : p)}
                  />
                )}
              </div>

              <div>
                <Label>Passage (optional)</Label>
                <Textarea
                  rows={3}
                  value={editingQuestion?.passage ?? ""}
                  onChange={(e) => setEditingQuestion((p) => p ? { ...p, passage: e.target.value || null } : p)}
                />
              </div>

              <div>
                <Label>Image URL (optional)</Label>
                <Input
                  value={editingQuestion?.image_url ?? ""}
                  onChange={(e) => setEditingQuestion((p) => p ? { ...p, image_url: e.target.value || null } : p)}
                  placeholder="https://example.com/image.png"
                />
                {editingQuestion?.image_url && (
                  <div className="mt-2 rounded-lg border p-2">
                    <img src={editingQuestion.image_url} alt="Question image preview" className="max-h-40 rounded object-contain" />
                  </div>
                )}
              </div>

              <div>
                <Label>Type</Label>
                <Select
                  value={editingQuestion?.question_type ?? "multiple-choice"}
                  onValueChange={(v) => setEditingQuestion((p) => p ? { ...p, question_type: v } : p)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                    <SelectItem value="grid-in">Grid-In</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editingQuestion?.question_type === "multiple-choice" && (
                <div className="space-y-2">
                  <Label>Options</Label>
                  {(editingQuestion?.options ?? ["", "", "", ""]).map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground w-5">{String.fromCharCode(65 + idx)}</span>
                      <Input
                        value={opt}
                        onChange={(e) => {
                          const opts = [...(editingQuestion?.options ?? ["", "", "", ""])];
                          opts[idx] = e.target.value;
                          setEditingQuestion((p) => p ? { ...p, options: opts } : p);
                        }}
                        placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                      />
                      <input
                        type="radio"
                        name="correct"
                        checked={editingQuestion?.correct_answer === idx}
                        onChange={() => setEditingQuestion((p) => p ? { ...p, correct_answer: idx } : p)}
                        className="accent-primary"
                      />
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">Select the radio button next to the correct answer.</p>
                </div>
              )}

              {editingQuestion?.question_type === "grid-in" && (
                <div>
                  <Label>Correct Numeric Answer</Label>
                  <Input
                    type="number"
                    step="any"
                    value={editingQuestion?.correct_answer_numeric ?? ""}
                    onChange={(e) => setEditingQuestion((p) => p ? { ...p, correct_answer_numeric: Number(e.target.value) } : p)}
                  />
                </div>
              )}

              <div>
                <Label>Explanation</Label>
                <Textarea
                  rows={3}
                  value={editingQuestion?.explanation ?? ""}
                  onChange={(e) => setEditingQuestion((p) => p ? { ...p, explanation: e.target.value } : p)}
                />
              </div>

              <div>
                <Label>Question Order</Label>
                <Input
                  type="number"
                  value={editingQuestion?.question_order ?? 1}
                  onChange={(e) => setEditingQuestion((p) => p ? { ...p, question_order: Number(e.target.value) } : p)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={saveQuestion}>
                <Save className="mr-1 h-4 w-4" /> Save Question
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default MockTestAdmin;
