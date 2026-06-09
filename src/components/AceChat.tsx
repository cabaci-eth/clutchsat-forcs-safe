import { useState, useRef, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Trash2, Square, GraduationCap, Crown, Eye } from "lucide-react";
import { useAceChat, type AceMessage } from "@/hooks/useAceChat";
import { useAuth } from "@/contexts/AuthContext";
import { useAceContext } from "@/contexts/AceContext";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import MathText from "@/components/MathText";
import { Link } from "react-router-dom";

/** 
 * Clean up AI response artifacts without breaking math delimiters.
 * Only strips $ that are NOT part of $...$ math pairs.
 */
function cleanAIResponse(text: string): string {
  // Remove lone $ on its own line (AI artifact, not a math delimiter)
  let result = text.replace(/^\$\s*$/gm, "");
  // If the ENTIRE response is wrapped in a single $ pair with no inner $, strip them
  const trimmed = result.trim();
  if (trimmed.startsWith("$") && trimmed.endsWith("$")) {
    const inner = trimmed.slice(1, -1);
    // If inner has no $ at all, it's a single math expression — keep it
    // If inner HAS $, the outer $ are likely stray wrapping — remove them
    if (inner.includes("$")) {
      result = inner;
    }
  }
  return result;
}

/** Renders markdown but also processes KaTeX math in text nodes */
const MathMarkdown = ({ content }: { content: string }) => (
  <ReactMarkdown
    components={{
      p: ({ children }) => (
        <p className="my-2.5 leading-relaxed">
          {processChildren(children)}
        </p>
      ),
      li: ({ children }) => (
        <li className="my-0.5">
          {processChildren(children)}
        </li>
      ),
      strong: ({ children }) => <strong>{processChildren(children)}</strong>,
      em: ({ children }) => <em>{processChildren(children)}</em>,
      code: ({ children, className }) => {
        if (!className) {
          return <code className="text-xs bg-background/50 px-1 rounded">{children}</code>;
        }
        return <code className={className}>{children}</code>;
      },
      pre: ({ children }) => (
        <pre className="my-1 overflow-x-auto rounded bg-background/50 p-2 text-xs">{children}</pre>
      ),
    }}
  >
    {cleanAIResponse(content)}
  </ReactMarkdown>
);

/** Process React children, rendering KaTeX for string nodes containing $ */
function processChildren(children: React.ReactNode): React.ReactNode {
  if (!children) return children;
  if (typeof children === "string") {
    if (children.includes("$")) {
      return <MathText text={children} />;
    }
    return children;
  }
  if (Array.isArray(children)) {
    return children.map((child, i) => {
      if (typeof child === "string" && child.includes("$")) {
        return <MathText key={i} text={child} />;
      }
      return child;
    });
  }
  return children;
}

const AceChat = () => {
  const { questionContext, chatOpen: open, setChatOpen: setOpen } = useAceContext();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuth();

  const {
    messages,
    isLoading,
    error,
    remainingMessages,
    send,
    stop,
    clear,
    isPremium,
  } = useAceChat();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    // Build question context string if available
    let ctxStr: string | undefined;
    if (questionContext) {
      const parts = [`Question: ${questionContext.questionText}`];
      if (questionContext.subject) parts.push(`Subject: ${questionContext.subject}`);
      if (questionContext.passage) parts.push(`Passage: ${questionContext.passage.slice(0, 500)}`);
      if (questionContext.options?.length) {
        parts.push(`Options:\nA) ${questionContext.options[0]}\nB) ${questionContext.options[1]}\nC) ${questionContext.options[2]}\nD) ${questionContext.options[3]}`);
      }
      ctxStr = parts.join("\n");
    }
    send(trimmed, ctxStr);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-shadow group"
            aria-label="Ask Ace"
          >
            <GraduationCap className="h-6 w-6 group-hover:scale-110 transition-transform" />
            {questionContext ? (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground">
                <Eye className="h-3 w-3" />
              </span>
            ) : (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground text-[10px] font-bold text-primary">
                AI
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-5 right-5 z-50 flex flex-col w-[calc(100vw-2.5rem)] sm:w-96 h-[min(32rem,calc(100vh-6rem))] rounded-2xl border border-border bg-card shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary/5 to-secondary/5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <GraduationCap className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground leading-tight">
                    Ask Ace
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    {questionContext ? "Viewing a question" : "Your SAT tutor"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={clear}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Clear chat"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Question context banner */}
            {questionContext && (
              <div className="mx-4 mt-2 mb-1 flex items-center gap-2 rounded-lg border border-secondary/30 bg-secondary/10 px-3 py-2">
                <Eye className="h-3.5 w-3.5 text-secondary shrink-0" />
                <p className="text-[11px] text-secondary font-medium truncate">
                  Ace can see your current question
                </p>
              </div>
            )}

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center h-full text-center px-4 gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                    <GraduationCap className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Hi! I'm Ace 👋
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your personal SAT tutor. Ask me anything about math, reading, writing, or test strategies!
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                    {(questionContext
                      ? [
                          "Help me with this question",
                          "Explain the concept here",
                          "What's the best approach?",
                        ]
                      : [
                          "Explain quadratic equations",
                          "Tips for reading passages",
                          "Grammar rules for SAT",
                        ]
                    ).map((q) => (
                      <button
                        key={q}
                        onClick={() => {
                          let ctxStr: string | undefined;
                          if (questionContext) {
                            const parts = [`Question: ${questionContext.questionText}`];
                            if (questionContext.subject) parts.push(`Subject: ${questionContext.subject}`);
                            if (questionContext.passage) parts.push(`Passage: ${questionContext.passage.slice(0, 500)}`);
                            if (questionContext.options?.length) {
                              parts.push(`Options:\nA) ${questionContext.options[0]}\nB) ${questionContext.options[1]}\nC) ${questionContext.options[2]}\nD) ${questionContext.options[3]}`);
                            }
                            ctxStr = parts.join("\n");
                          }
                          send(q, ctxStr);
                        }}
                        className="rounded-full border border-border bg-muted/50 px-3 py-1.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <MessageBubble key={i} message={msg} />
              ))}

              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-2 items-start">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <GraduationCap className="h-3 w-3 text-primary" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-muted px-3 py-2">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="px-4 py-2 border-t border-destructive/20 bg-destructive/5">
                <p className="text-xs text-destructive">{error}</p>
                {!user && (
                  <Link
                    to="/signup"
                    className="text-xs text-primary font-medium underline mt-1 inline-block"
                    onClick={() => setOpen(false)}
                  >
                    Sign up free →
                  </Link>
                )}
                {user && !isPremium && remainingMessages === 0 && (
                  <Link
                    to="/pricing"
                    className="text-xs text-primary font-medium underline mt-1 inline-flex items-center gap-1"
                    onClick={() => setOpen(false)}
                  >
                    <Crown className="h-3 w-3" /> Upgrade to Premium →
                  </Link>
                )}
              </div>
            )}

            {/* Footer / Input */}
            <div className="border-t border-border bg-card px-3 py-2.5">
              <form onSubmit={handleSubmit} className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Ace anything..."
                  rows={1}
                  className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring max-h-24 scrollbar-thin"
                  disabled={isLoading}
                />
                {isLoading ? (
                  <button
                    type="button"
                    onClick={stop}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                    title="Stop"
                  >
                    <Square className="h-3.5 w-3.5 fill-current" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
                    title="Send"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                )}
              </form>

              {/* Usage indicator */}
              <div className="mt-1.5 flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground">
                  {isPremium ? (
                    <span className="inline-flex items-center gap-1">
                      <Crown className="h-2.5 w-2.5 text-amber-500" />
                      Unlimited messages
                    </span>
                  ) : remainingMessages !== null ? (
                    `${remainingMessages} message${remainingMessages !== 1 ? "s" : ""} left today`
                  ) : !user ? (
                    `${Math.max(0, 3 - (parseInt(localStorage.getItem(`ace_guest_${new Date().toISOString().split("T")[0]}`) || "0", 10)))} messages left today`
                  ) : null}
                </p>
                <p className="text-[10px] text-muted-foreground/60">
                  Powered by AI
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const MessageBubble = ({ message }: { message: AceMessage }) => {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-2 items-start", isUser && "flex-row-reverse")}>
      {!isUser && (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <GraduationCap className="h-3 w-3 text-primary" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 text-sm overflow-hidden",
          isUser
            ? "rounded-tr-sm bg-primary text-primary-foreground"
            : "rounded-tl-sm bg-muted text-foreground"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none break-words [&_.katex]:text-[1.15em]">
            <MathMarkdown content={message.content} />
          </div>
        )}
      </div>
    </div>
  );
};

export default AceChat;
