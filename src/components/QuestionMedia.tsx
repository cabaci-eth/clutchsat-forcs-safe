import { useQuery } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";
import ImageLightbox from "./ImageLightbox";

type Props = {
  questionId: string;
};

// Extract storage path from a full public URL or return as-is if already a path
const extractPath = (mediaUrl: string): string | null => {
  try {
    const marker = "/object/public/question-images/";
    const idx = mediaUrl.indexOf(marker);
    if (idx !== -1) return mediaUrl.substring(idx + marker.length);
    // If it doesn't look like a full URL, assume it's already a path
    if (!mediaUrl.startsWith("http")) return mediaUrl;
    return null;
  } catch {
    return null;
  }
};

const QuestionMedia = ({ questionId }: Props) => {
  const { data: media = [] } = useQuery({
    queryKey: ["question_media", questionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("question_media")
        .select("*")
        .eq("question_id", questionId)
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: signedUrls = {} } = useQuery({
    queryKey: ["question_media_urls", questionId, media.map(m => m.id).join(",")],
    enabled: media.length > 0,
    queryFn: async () => {
      const urls: Record<string, string> = {};
      for (const m of media) {
        if (m.media_type !== "image") continue;
        const path = extractPath(m.media_url);
        if (path) {
          const { data } = await supabase.storage
            .from("question-images")
            .createSignedUrl(path, 3600); // 1 hour
          if (data?.signedUrl) urls[m.id] = data.signedUrl;
        }
      }
      return urls;
    },
    staleTime: 30 * 60 * 1000, // 30 min
  });

  if (media.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {media.map((m) =>
        m.media_type === "image" ? (
          <ImageLightbox
            key={m.id}
            src={signedUrls[m.id] || m.media_url}
            caption={m.caption || undefined}
          />
        ) : (
          <div
            key={m.id}
            className="overflow-x-auto rounded-xl border border-border bg-muted/30 p-3 text-sm"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(m.media_url) }}
          />
        )
      )}
    </div>
  );
};

export default QuestionMedia;
