import MathText from "./MathText";

interface PassageBlockProps {
  passage: string;
  label?: string;
}

const bulletBlockPattern = /\$\s*\\begin\{aligned\}([\s\S]*?)\\end\{aligned\}\s*\$/m;
const bulletItemPattern = /&?\s*\\bullet\s*\\text\{([\s\S]*?)\}(?=\s*(?:\\\\|$))/g;

const decodeBulletText = (value: string) =>
  value
    .replace(/\\([%#$&_{}])/g, "$1")
    .replace(/\\\\/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const parseBulletPassage = (passage: string) => {
  const blockMatch = passage.match(bulletBlockPattern);
  if (!blockMatch || blockMatch.index === undefined) return null;

  const bullets = Array.from(blockMatch[1].matchAll(bulletItemPattern))
    .map((match) => decodeBulletText(match[1]))
    .filter(Boolean);

  if (bullets.length === 0) return null;

  const intro = passage.slice(0, blockMatch.index).trim();
  const outro = passage.slice(blockMatch.index + blockMatch[0].length).trim();

  return { intro, bullets, outro };
};

const PassageBlock = ({ passage, label }: PassageBlockProps) => {
  const parsedBulletPassage = parseBulletPassage(passage);

  return (
    <div className="mb-4 rounded-xl border border-border bg-muted/50 p-5 dark:bg-muted/30">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label || "Passage"}
      </span>
      <div className="passage-content overflow-hidden text-sm leading-relaxed text-foreground" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
        {parsedBulletPassage ? (
          <div className="space-y-3">
            {parsedBulletPassage.intro ? <MathText text={parsedBulletPassage.intro} block /> : null}
            <ul className="passage-bullet-list">
              {parsedBulletPassage.bullets.map((item, index) => (
                <li key={`${index}-${item.slice(0, 24)}`}>
                  <MathText text={item} />
                </li>
              ))}
            </ul>
            {parsedBulletPassage.outro ? <MathText text={parsedBulletPassage.outro} block /> : null}
          </div>
        ) : (
          <MathText text={passage} block />
        )}
      </div>
    </div>
  );
};

export default PassageBlock;
