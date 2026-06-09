import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { type AceMessage } from "@/hooks/useAceChat";

type QuestionContext = {
  questionText: string;
  options?: string[];
  subject?: string;
  explanation?: string;
  passage?: string;
} | null;

type AceContextType = {
  questionContext: QuestionContext;
  setQuestionContext: (ctx: QuestionContext) => void;
  clearQuestionContext: () => void;
  chatMessages: AceMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<AceMessage[]>>;
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
};

const AceContext = createContext<AceContextType>({
  questionContext: null,
  setQuestionContext: () => {},
  clearQuestionContext: () => {},
  chatMessages: [],
  setChatMessages: () => {},
  chatOpen: false,
  setChatOpen: () => {},
});

export const AceProvider = ({ children }: { children: ReactNode }) => {
  const [questionContext, setQuestionContext] = useState<QuestionContext>(null);
  const clearQuestionContext = useCallback(() => setQuestionContext(null), []);
  const [chatMessages, setChatMessages] = useState<AceMessage[]>([]);
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <AceContext.Provider value={{ questionContext, setQuestionContext, clearQuestionContext, chatMessages, setChatMessages, chatOpen, setChatOpen }}>
      {children}
    </AceContext.Provider>
  );
};

export const useAceContext = () => useContext(AceContext);
