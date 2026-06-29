import { useState, useEffect } from "react";

const KEY = "byop.theme";

function resolveInitial() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch { /* no-op */ }
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: light)").matches) {
    return "light";
  }
  return "dark";
}

export default function useTheme() {
  const [theme, setThemeRaw] = useState(resolveInitial);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem(KEY, theme); } catch { /* no-op */ }
  }, [theme]);

  const toggle = () => setThemeRaw((t) => (t === "dark" ? "light" : "dark"));

  return { theme, toggle };
}
