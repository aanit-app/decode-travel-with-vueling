"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/lib/store/theme-store";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((state) => state.theme);

  // Initialize theme immediately on mount to prevent flash
  useEffect(() => {
    const root = document.documentElement;
    
    // Initialize from localStorage if available
    try {
      const stored = localStorage.getItem("theme-storage");
      if (stored) {
        const parsed = JSON.parse(stored);
        const savedTheme = parsed.state?.theme;
        if (savedTheme === "dark") {
          root.classList.add("dark");
        } else {
          root.classList.remove("dark");
        }
      }
    } catch {
      // Ignore errors
    }
  }, []);

  // Update theme when it changes
  useEffect(() => {
    const root = document.documentElement;
    
    // Apply the current theme
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  return <>{children}</>;
}

