/* ═══════════════════════════════════════════
   Chart Type Definitions
   ═══════════════════════════════════════════ */

export interface PricePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface VolumePoint {
  date: string;
  volume: number;
}

export interface SentimentPoint {
  date: string;
  sentiment: number; // 0–100, higher = more bullish
  confidence: number;
}

export interface MAPoint {
  date: string;
  value: number;
}

export type ChartTimeframe = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "ALL";

export interface ChartColors {
  line: string;
  area: string;
  bullish: string;
  bearish: string;
  volume: string;
  grid: string;
  text: string;
  tooltip: {
    bg: string;
    border: string;
    text: string;
    muted: string;
  };
}
