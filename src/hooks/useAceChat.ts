import { useState, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription, isPremiumUser } from "@/hooks/useSubscription";
import { useAceContext } from "@/contexts/AceContext";

export type AceMessage = {
  role: "user" | "assistant";
  content: string;
};

const GUEST_DAILY_LIMIT = 3;
const FREE_DAILY_LIMIT = 5;
const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ace-chat`;

function getGuestUsageKey() {
  return `ace_guest_${new Date().toISOString().split("T")[0]}`;
}

function getGuestUsage(): number {
  const key = getGuestUsageKey();
  return parseInt(localStorage.getItem(key) || "0", 10);
}

function incrementGuestUsage() {
  const key = getGuestUsageKey();
  const current = getGuestUsage();
  localStorage.setItem(key, String(current + 1));
}

export function useAceChat() {
  const { chatMessages: messages, setChatMessages: setMessages } = useAceContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingMessages, setRemainingMessages] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { user } = useAuth();
  const { data: subscription } = useSubscription();
  const premium = isPremiumUser(subscription?.subscription_end);

  const getLimit = useCallback(() => {
    if (premium) return Infinity;
    if (user) return FREE_DAILY_LIMIT;
    return GUEST_DAILY_LIMIT;
  }, [premium, user]);

  const getRemainingForGuest = useCallback(() => {
    if (!user && !premium) {
      return Math.max(0, GUEST_DAILY_LIMIT - getGuestUsage());
    }
    return null;
  }, [user, premium]);

  const send = useCallback(
    async (input: string, questionContext?: string) => {
      setError(null);

      // Guest rate limit check
      if (!user) {
        const guestRemaining = GUEST_DAILY_LIMIT - getGuestUsage();
        if (guestRemaining <= 0) {
          setError("Sign up for free to get 5 messages/day with Ace, or go Premium for unlimited access!");
          return;
        }
      }

      const userMsg: AceMessage = { role: "user", content: input };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      let assistantSoFar = "";
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        };

        // If logged in, use user's auth token
        if (user) {
          const { supabase } = await import("@/integrations/supabase/client");
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            headers.Authorization = `Bearer ${session.access_token}`;
          }
        }

        const resp = await fetch(CHAT_URL, {
          method: "POST",
          headers,
          body: JSON.stringify({
            messages: [...messages, userMsg].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            questionContext,
          }),
          signal: controller.signal,
        });

        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          if (errData.error === "daily_limit_reached") {
            setError(errData.message);
            setRemainingMessages(0);
            setIsLoading(false);
            return;
          }
          throw new Error(errData.error || "Failed to get response");
        }

        // Read remaining messages header
        const remaining = resp.headers.get("X-Remaining-Messages");
        if (remaining !== null) {
          setRemainingMessages(parseInt(remaining, 10));
        } else if (resp.headers.get("X-Premium") === "true") {
          setRemainingMessages(null); // unlimited
        }

        if (!user) {
          incrementGuestUsage();
          setRemainingMessages(GUEST_DAILY_LIMIT - getGuestUsage());
        }

        if (!resp.body) throw new Error("No response stream");

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = "";

        const upsertAssistant = (nextChunk: string) => {
          assistantSoFar += nextChunk;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant") {
              return prev.map((m, i) =>
                i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
              );
            }
            return [...prev, { role: "assistant", content: assistantSoFar }];
          });
        };

        let streamDone = false;
        while (!streamDone) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);

            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") {
              streamDone = true;
              break;
            }

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) upsertAssistant(content);
            } catch {
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }

        // Final flush
        if (textBuffer.trim()) {
          for (let raw of textBuffer.split("\n")) {
            if (!raw) continue;
            if (raw.endsWith("\r")) raw = raw.slice(0, -1);
            if (raw.startsWith(":") || raw.trim() === "") continue;
            if (!raw.startsWith("data: ")) continue;
            const jsonStr = raw.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) upsertAssistant(content);
            } catch {
              /* ignore */
            }
          }
        }
      } catch (e: any) {
        if (e.name === "AbortError") return;
        console.error("Ace chat error:", e);
        setError(e.message || "Something went wrong. Please try again.");
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [messages, user]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    remainingMessages,
    send,
    stop,
    clear,
    isPremium: premium,
    getLimit,
    getRemainingForGuest,
  };
}
