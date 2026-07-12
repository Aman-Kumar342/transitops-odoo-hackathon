"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

/**
 * Dark-mode toggle. Persists the choice to localStorage and sets `data-theme` on
 * <html>, which the CSS tokens in globals.css respond to. A matching inline script in
 * the root layout applies the saved theme before paint (no flash). (bonus, PDF §8)
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const attr = document.documentElement.getAttribute("data-theme");
    if (attr === "dark" || attr === "light") {
      setTheme(attr);
    } else {
      setTheme(
        window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
      );
    }
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* ignore storage errors */
    }
    setTheme(next);
  }

  return (
    <button
      type="button"
      className="btn"
      onClick={toggle}
      aria-label="Toggle dark mode"
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      style={{ padding: "6px 10px" }}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
