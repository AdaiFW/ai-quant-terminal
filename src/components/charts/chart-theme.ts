/* ═══════════════════════════════════════════
   Chart Theme — Dark Mode Aware
   ═══════════════════════════════════════════ */

import type { ChartColors } from "./types";

/**
 * Resolve chart colors from CSS custom properties.
 * Call once on mount and on theme change.
 */
export function getChartColors(): ChartColors {
  if (typeof window === "undefined") return lightColors();

  const style = getComputedStyle(document.documentElement);
  const isDark = document.documentElement.classList.contains("dark");

  return {
    line: `hsl(${style.getPropertyValue("--primary").trim()})`,
    area: `hsla(${style.getPropertyValue("--primary").trim().replace(")", "")}, 0.15)`,
    bullish: `hsl(${style.getPropertyValue("--bullish").trim()})`,
    bearish: `hsl(${style.getPropertyValue("--bearish").trim()})`,
    volume: `hsl(${style.getPropertyValue("--muted-foreground").trim()})`,
    grid: isDark
      ? "rgba(255,255,255,0.04)"
      : "rgba(0,0,0,0.06)",
    text: `hsl(${style.getPropertyValue("--muted-foreground").trim()})`,
    tooltip: {
      bg: isDark
        ? "hsl(240 3.7% 15.9%)"
        : "hsl(0 0% 100%)",
      border: isDark
        ? "hsl(240 3.7% 15.9%)"
        : "hsl(240 5.9% 90%)",
      text: `hsl(${style.getPropertyValue("--foreground").trim()})`,
      muted: `hsl(${style.getPropertyValue("--muted-foreground").trim()})`,
    },
  };
}

function lightColors(): ChartColors {
  return {
    line: "hsl(240 5.9% 10%)",
    area: "hsla(240 5.9% 10%, 0.15)",
    bullish: "hsl(142 71% 38%)",
    bearish: "hsl(0 72% 51%)",
    volume: "hsl(240 3.8% 46.1%)",
    grid: "rgba(0,0,0,0.06)",
    text: "hsl(240 3.8% 46.1%)",
    tooltip: {
      bg: "hsl(0 0% 100%)",
      border: "hsl(240 5.9% 90%)",
      text: "hsl(240 10% 3.9%)",
      muted: "hsl(240 3.8% 46.1%)",
    },
  };
}
