import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

export const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
  { label: "One special character (!@#$%^&*)", test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];

export const isPasswordStrong = (password: string) =>
  PASSWORD_RULES.every((r) => r.test(password));

const PasswordStrength = ({ password, className }: PasswordStrengthProps) => {
  const results = useMemo(
    () => PASSWORD_RULES.map((r) => ({ ...r, passed: r.test(password) })),
    [password]
  );
  const passedCount = results.filter((r) => r.passed).length;
  const strengthPct = (passedCount / PASSWORD_RULES.length) * 100;

  const strengthColor =
    strengthPct <= 40 ? "bg-destructive" : strengthPct <= 80 ? "bg-amber-500" : "bg-success";

  if (!password) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex gap-1">
        {PASSWORD_RULES.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i < passedCount ? strengthColor : "bg-muted"
            )}
          />
        ))}
      </div>
      <ul className="space-y-1">
        {results.map((r, i) => (
          <li key={i} className="flex items-center gap-2 text-xs">
            {r.passed ? (
              <Check className="h-3 w-3 text-success shrink-0" />
            ) : (
              <X className="h-3 w-3 text-muted-foreground shrink-0" />
            )}
            <span className={r.passed ? "text-success" : "text-muted-foreground"}>{r.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PasswordStrength;
