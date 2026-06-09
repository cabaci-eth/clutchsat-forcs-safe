import { useMemo } from "react";
import DOMPurify from "dompurify";
import katex from "katex";
import "katex/dist/katex.min.css";

interface MathTextProps {
  text: string;
  className?: string;
  block?: boolean;
}

/**
 * Renders text with inline LaTeX math between $ delimiters.
 * Supports bold (**), italic (*), underline (__text__), line breaks (\n),
 * and non-math KaTeX formatting via \text{}, \textbf{}, \underline{} inside $.
 */
const MathText = ({ text, className = "", block = false }: MathTextProps) => {
  const html = useMemo(() => {
    if (!text) return "";
    // Split on $...$ for inline math
    const parts = text.split(/(\$[^$]+\$)/g);
    return parts
      .map((part) => {
        if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
          const tex = part.slice(1, -1);
          try {
            return katex.renderToString(tex, { throwOnError: false, displayMode: false });
          } catch {
            return part;
          }
        }
        // Basic markdown: **bold**, *italic*, __underline__, line breaks
        return part
          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*(.+?)\*/g, "<em>$1</em>")
          .replace(/__(.+?)__/g, '<span style="text-decoration:underline">$1</span>')
          .replace(/\n/g, "<br/>");
      })
      .join("");
  }, [text]);

  const Tag = block ? "div" : "span";
  const sanitized = useMemo(() => DOMPurify.sanitize(html, { ADD_TAGS: ["semantics", "annotation", "mrow", "mi", "mo", "mn", "msup", "msub", "mfrac", "msqrt", "mover", "munder", "mtable", "mtr", "mtd", "mtext", "mspace", "menclose", "mpadded", "mphantom", "mstyle", "merror", "math"], ADD_ATTR: ["xmlns", "mathvariant", "encoding", "stretchy", "fence", "separator", "accent", "accentunder", "columnalign", "rowalign", "columnspacing", "rowspacing", "columnlines", "rowlines", "frame", "framespacing", "displaystyle", "scriptlevel", "width", "height", "depth", "lspace", "rspace", "linethickness", "notation", "class", "style"] }), [html]);

  return <Tag className={`${className} [overflow-wrap:anywhere]`} dangerouslySetInnerHTML={{ __html: sanitized }} />;
};

export default MathText;
