/* ═══════════════════════════════════════════
   Chart Data Transformers
   ═══════════════════════════════════════════ */

import type { PricePoint, VolumePoint, SentimentPoint } from "./types";

/**
 * Convert raw API OHLCV data to PricePoint array.
 */
export function toPricePoints(
  raw: { timestamp: string; open: number; high: number; low: number; close: number; volume: number }[],
): PricePoint[] {
  return raw.map((p) => ({
    date: p.timestamp,
    open: p.open,
    high: p.high,
    low: p.low,
    close: p.close,
  }));
}

/**
 * Extract volume points from OHLCV data.
 */
export function toVolumePoints(
  raw: { timestamp: string; volume: number }[],
): VolumePoint[] {
  return raw.map((p) => ({
    date: p.timestamp,
    volume: p.volume,
  }));
}

/**
 * Convert AI analysis history to sentiment points.
 */
export function toSentimentPoints(
  analyses: { createdAt: string; confidence: number; sentiment?: string }[],
): SentimentPoint[] {
  return analyses.map((a) => ({
    date: a.createdAt,
    sentiment: sentimentToScore(a.sentiment ?? "Neutral", a.confidence),
    confidence: a.confidence,
  }));
}

function sentimentToScore(
  sentiment: string,
  confidence: number,
): number {
  const base =
    sentiment === "Bullish" ? 80 : sentiment === "Bearish" ? 20 : 50;
  // Blend with confidence: high confidence pushes toward extremes
  const blend = (confidence / 100) * (base - 50);
  return Math.round(50 + blend);
}

/**
 * Compute simple moving average from price points.
 */
export function computeSMA(
  data: PricePoint[],
  period: number,
): { date: string; value: number }[] {
  const result: { date: string; value: number }[] = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += data[j]!.close;
    }
    result.push({
      date: data[i]!.date,
      value: sum / period,
    });
  }
  return result;
}

/**
 * Filter price data to a timeframe.
 */
export function filterByTimeframe<T extends { date: string }>(
  data: T[],
  timeframe: string,
): T[] {
  const now = Date.now();
  const msMap: Record<string, number> = {
    "1W": 7 * 24 * 60 * 60 * 1000,
    "1M": 30 * 24 * 60 * 60 * 1000,
    "3M": 90 * 24 * 60 * 60 * 1000,
    "6M": 180 * 24 * 60 * 60 * 1000,
    "1Y": 365 * 24 * 60 * 60 * 1000,
  };
  const cutoff = msMap[timeframe] ? now - msMap[timeframe] : 0;
  if (cutoff === 0) return data;
  return data.filter((p) => new Date(p.date).getTime() >= cutoff);
}
