import { Bookmark } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

interface BookmarkButtonProps {
  questionId: string;
  isSaved: boolean;
  size?: "sm" | "md";
}

const BookmarkButton = ({ questionId, isSaved, size = "sm" }: BookmarkButtonProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast({ title: "Sign in to save questions" });
      return;
    }
    if (isSaved) {
      await supabase.from("saved_questions").delete().eq("user_id", user.id).eq("question_id", questionId);
    } else {
      await supabase.from("saved_questions").insert({ user_id: user.id, question_id: questionId });
    }
    queryClient.invalidateQueries({ queryKey: ["saved_question_ids"] });
  };

  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <button
      onClick={toggle}
      className={`p-1 rounded hover:bg-muted transition-colors ${isSaved ? "text-primary" : "text-muted-foreground"}`}
      title={isSaved ? "Remove bookmark" : "Save for later"}
    >
      <Bookmark className={`${iconSize} ${isSaved ? "fill-primary" : ""}`} />
    </button>
  );
};

export default BookmarkButton;
