import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type AppTheme = "white" | "dark" | "mboa";
const THEME_STORAGE_KEY = "kymia.theme";

function readTheme(): AppTheme {
  if (typeof window === "undefined") return "white";
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === "dark" || value === "mboa" ? value : "white";
  } catch {
    return "white";
  }
}

function applyTheme(theme: AppTheme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", theme === "dark");
}

const ThemeContext = createContext<{ theme: AppTheme; setTheme: (theme: AppTheme) => void } | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>("white");

  useEffect(() => {
    const stored = readTheme();
    setThemeState(stored);
    applyTheme(stored);
  }, []);

  const value = useMemo(() => ({
    theme,
    setTheme: (next: AppTheme) => {
      setThemeState(next);
      applyTheme(next);
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // The current page still adopts the selected theme if storage is unavailable.
      }
    },
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider");
  return value;
}
