"use client";

import * as React from "react";

export type ThemeName = "dark" | "light";

interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = "mealflow-theme";

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

/**
 * Gestisce il tema visivo dell'app. Il tema predefinito è "dark" (come
 * richiesto dal design system); l'utente può passare al tema chiaro
 * "Maiolica di Capri", persistito in localStorage.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<ThemeName>("dark");

  React.useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeName | null;
    if (stored === "light" || stored === "dark") {
      setThemeState(stored);
    }
  }, []);

  React.useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = React.useCallback((next: ThemeName) => setThemeState(next), []);
  const toggleTheme = React.useCallback(
    () => setThemeState((prev) => (prev === "dark" ? "light" : "dark")),
    [],
  );

  const value = React.useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme deve essere usato dentro <ThemeProvider>");
  return ctx;
}
