import { useState, useCallback } from "react";
import { X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  src: string;
  alt?: string;
  caption?: string;
};

const ImageLightbox = ({ src, alt = "", caption }: Props) => {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handleError = useCallback(() => {
    if (retryCount < 2) {
      // Retry by appending a cache-busting param
      setRetryCount((c) => c + 1);
      setLoaded(false);
    } else {
      setError(true);
    }
  }, [retryCount]);

  if (!src || error) return null;

  // Append retry param to bust cache on retries
  const imgSrc = retryCount > 0 ? `${src}${src.includes("?") ? "&" : "?"}retry=${retryCount}` : src;

  return (
    <>
      <figure className="my-3">
        {!loaded && (
          <Skeleton className="w-full h-40 rounded-xl" />
        )}
        <img
          src={imgSrc}
          alt={alt}
          className={`max-w-full rounded-xl border border-border cursor-pointer hover:opacity-90 transition-opacity ${!loaded ? "hidden" : ""}`}
          style={{ maxHeight: 300 }}
          onClick={() => setOpen(true)}
          onLoad={() => setLoaded(true)}
          onError={handleError}
        />
        {caption && <figcaption className="text-xs text-muted-foreground mt-1">{caption}</figcaption>}
      </figure>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <button
            className="absolute top-4 right-4 rounded-full bg-card p-2 shadow-md hover:bg-muted"
            onClick={() => setOpen(false)}
          >
            <X className="h-5 w-5 text-foreground" />
          </button>
          <img
            src={imgSrc}
            alt={alt}
            className="max-h-[90vh] max-w-[90vw] rounded-xl shadow-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

export default ImageLightbox;
