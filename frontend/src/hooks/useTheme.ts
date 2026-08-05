import { useEffect, useState } from "react";
import type { Theme } from "../utils/ScdTypes";

const STORAGE_KEY = "flowops-theme";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    window.localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark",
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }

  return { theme, toggleTheme };
}
