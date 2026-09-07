import { useCallback, useEffect, useState } from "react";

export type ColorTheme = "light" | "dark";

const STORAGE_KEY = "classic-hall-color-theme";

function getInitialTheme(): ColorTheme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function useColorTheme() {
  const [theme, setTheme] = useState<ColorTheme>(getInitialTheme);

  useEffect(() => {
    const isDark = theme === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem(STORAGE_KEY, theme);

    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    themeColor?.setAttribute("content", isDark ? "#0f172a" : "#f8fafc");
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => current === "dark" ? "light" : "dark");
  }, []);

  return { theme, toggleTheme };
}
