import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
  themeLocked: boolean;
  lockTheme: (t: "light" | "dark") => void;
  unlockTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  setTheme: () => {},
  resolvedTheme: "dark",
  themeLocked: false,
  lockTheme: () => {},
  unlockTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

const getSystemTheme = (): "light" | "dark" =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem("theme") as Theme) || "dark";
  });
  const [lockedTheme, setLockedTheme] = useState<"light" | "dark" | null>(null);

  const resolvedTheme = lockedTheme ?? (theme === "system" ? getSystemTheme() : theme);
  const themeLocked = lockedTheme !== null;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    if (theme === "system" && !lockedTheme) {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => setThemeState("system");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [theme, lockedTheme]);

  // Load from profile on login
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("theme_preference")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.theme_preference) {
          const t = data.theme_preference as Theme;
          setThemeState(t);
          localStorage.setItem("theme", t);
        }
      });
  }, [user]);

  const setTheme = (t: Theme) => {
    if (lockedTheme) return; // ignore while locked
    setThemeState(t);
    localStorage.setItem("theme", t);
    if (user) {
      supabase.from("profiles").update({ theme_preference: t }).eq("user_id", user.id).then();
    }
  };

  const lockTheme = useCallback((t: "light" | "dark") => {
    setLockedTheme(t);
  }, []);

  const unlockTheme = useCallback(() => {
    setLockedTheme(null);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme, themeLocked, lockTheme, unlockTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
