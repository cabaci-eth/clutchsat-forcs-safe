import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useMockTests = () => {
  return useQuery({
    queryKey: ["mock-tests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mock_tests")
        .select("*")
        .order("order_index");
      if (error) throw error;
      return data;
    },
  });
};

export const useMockTestModules = (testId: string | undefined) => {
  return useQuery({
    queryKey: ["mock-test-modules", testId],
    enabled: !!testId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mock_test_modules")
        .select("*")
        .eq("test_id", testId!)
        .order("module_name", { ascending: false })
        .order("module_order");
      if (error) throw error;
      return data;
    },
  });
};

// Fetches questions WITHOUT correct answers (uses safe view)
export const useMockTestQuestions = (testId: string | undefined) => {
  return useQuery({
    queryKey: ["mock-test-questions", testId],
    enabled: !!testId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mock_test_questions_public" as any)
        .select("*")
        .eq("test_id", testId!)
        .order("module_name", { ascending: false })
        .order("module_order")
        .order("question_order");
      if (error) throw error;
      return data as any[];
    },
  });
};

// RPC: check a single answer (for practice mode)
export const checkMockAnswer = async (questionId: string, selectedAnswer: number) => {
  const { data, error } = await supabase.rpc("check_mock_answer", {
    p_question_id: questionId,
    p_selected_answer: selectedAnswer,
  });
  if (error) throw error;
  return data as { is_correct: boolean; correct_answer: number; explanation: string };
};

// RPC: score a full mock test (for simulation mode)
export const scoreMockTest = async (testId: string, answers: Record<string, number | null>) => {
  const { data, error } = await supabase.rpc("score_mock_test", {
    p_test_id: testId,
    p_answers: answers,
  });
  if (error) throw error;
  return data as {
    questions: Record<string, { is_correct: boolean; correct_answer: number; module_name: string; module_order: number }>;
  };
};

// RPC: get answers for a completed test report
export const getMockTestAnswers = async (testId: string) => {
  const { data, error } = await supabase.rpc("get_mock_test_answers", {
    p_test_id: testId,
  });
  if (error) throw error;
  return data as Record<string, { correct_answer: number; explanation: string }>;
};

// RPC: get guest attempts scoped to session
export const getGuestMockAttempts = async (sessionId: string, testId?: string) => {
  const { data, error } = await supabase.rpc("get_guest_mock_attempts", {
    p_session_id: sessionId,
    p_test_id: testId ?? null,
  });
  if (error) throw error;
  return data;
};

export const useMockTestAttempts = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["mock-test-attempts", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mock_test_attempts")
        .select("*, mock_tests(title)")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

export function getGuestSessionId(): string {
  let id = localStorage.getItem("clutchsat_guest_session");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("clutchsat_guest_session", id);
  }
  return id;
}

// RPC: insert a guest mock attempt (session-validated server-side)
export const insertGuestMockAttempt = async (sessionId: string, testId: string, mode: string = "practice") => {
  const { data, error } = await supabase.rpc("insert_guest_mock_attempt" as any, {
    p_session_id: sessionId,
    p_test_id: testId,
    p_mode: mode,
  });
  if (error) throw error;
  return data as string; // returns the new attempt UUID
};

// RPC: update a guest mock attempt (session-validated server-side)
export const updateGuestMockAttempt = async (
  sessionId: string,
  attemptId: string,
  updates: {
    answers?: any;
    time_spent?: any;
    completed_at?: string | null;
    total_score?: number | null;
    section_scores?: any;
  }
) => {
  const { data, error } = await supabase.rpc("update_guest_mock_attempt" as any, {
    p_session_id: sessionId,
    p_attempt_id: attemptId,
    p_answers: updates.answers ?? null,
    p_time_spent: updates.time_spent ?? null,
    p_completed_at: updates.completed_at ?? null,
    p_total_score: updates.total_score ?? null,
    p_section_scores: updates.section_scores ?? null,
  });
  if (error) throw error;
  return data as boolean;
};
