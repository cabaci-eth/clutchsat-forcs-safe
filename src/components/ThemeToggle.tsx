import { Sun, Moon, Monitor, Lock } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";

const ThemeToggle = () => {
  const { theme, setTheme, themeLocked } = useTheme();

  const cycle = () => {
    if (themeLocked) return;
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={cycle}
      className={`gap-1.5 ${themeLocked ? "opacity-50 cursor-not-allowed" : ""}`}
      disabled={themeLocked}
    >
      {themeLocked ? (
        <Lock className="h-4 w-4" />
      ) : (
        <>
          {theme === "light" && <Sun className="h-4 w-4" />}
          {theme === "dark" && <Moon className="h-4 w-4" />}
          {theme === "system" && <Monitor className="h-4 w-4" />}
        </>
      )}
      <span className="text-xs capitalize">{themeLocked ? "locked" : theme}</span>
    </Button>
  );
};

export default ThemeToggle;
