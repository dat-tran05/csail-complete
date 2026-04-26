"use client";
import { useEffect } from "react";

/**
 * Sets data-theme on <html> for the lifetime of the page that mounts it.
 * Use <ThemeScope theme="paper" /> at the top of /directory.
 */
export function ThemeScope({ theme }: { theme: "ink" | "paper" }) {
  useEffect(() => {
    const prev = document.documentElement.getAttribute("data-theme");
    document.documentElement.setAttribute("data-theme", theme);
    return () => {
      if (prev) document.documentElement.setAttribute("data-theme", prev);
      else document.documentElement.removeAttribute("data-theme");
    };
  }, [theme]);
  return null;
}
