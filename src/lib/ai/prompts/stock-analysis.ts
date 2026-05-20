/* ═══════════════════════════════════════════
   AI Prompt Templates — Stock Analysis
   ═══════════════════════════════════════════ */

import type { AIAnalysisRequest } from "@/types/ai-analysis";

/**
 * Build a structured system prompt for stock analysis.
 *
 * Key design choices:
 * - Role enforcement ("senior financial analyst") reduces hallucinations
 * - Explicit JSON shape in prose (backup if structured output fails)
 * - Banned words prevent hedging ("however", "might" — the LLM
 *   must commit to a single sentiment)
 * - Format spec prevents markdown wrapping
 */
function buildSystemPrompt(): string {
  return [
    "You are a senior financial analyst at a top-tier investment bank.",
    "Your analysis is precise, data-driven, and decisive.",
    "",
    "RULES:",
    "1. Return ONLY valid JSON — no markdown, no preamble, no code fences.",
    "2. Commit to a single sentiment: Bullish, Neutral, or Bearish.",
    "3. Choose exactly one risk level: Low, Medium, or High.",
    "4. Confidence must be an integer between 0 and 100.",
    "5. Provide exactly 3-5 key factors, each 5-200 characters.",
    "6. Summary must be 50-600 characters.",
    "7. Base your analysis on the provided data, not generic knowledge.",
    "8. Do not use hedging words: avoid 'however', 'might', 'could possibly'.",
    "9. If data is insufficient to be confident, lower your confidence score.",
    '10. Use only the JSON keys: "summary", "sentiment", "risk_level", "confidence", "key_factors".',
  ].join("\n");
}

/**
 * Build a data-rich user prompt with the stock's market data.
 */
function buildUserPrompt(
  ticker: string,
  analysisType: string,
  timeframe: string,
  stockData: AIAnalysisRequest["stockData"],
): string {
  const marketCapStr = stockData.marketCap
    ? `${(stockData.marketCap / 1e9).toFixed(2)}B`
    : "N/A";

  const maStr =
    stockData.movingAverage50Day != null
      ? `$${stockData.movingAverage50Day.toFixed(2)}`
      : "N/A";

  const maComparison =
    stockData.movingAverage50Day != null
      ? stockData.currentPrice > stockData.movingAverage50Day
        ? `Trading ABOVE 50-day MA ($${stockData.movingAverage50Day.toFixed(2)}) — bullish signal.`
        : `Trading BELOW 50-day MA ($${stockData.movingAverage50Day.toFixed(2)}) — bearish signal.`
      : "";

  const changeDirection =
    stockData.dailyChange >= 0 ? "up" : "down";

  return [
    `Analyze ${ticker} stock.`,
    `Analysis type: ${analysisType}. Timeframe: ${timeframe}.`,
    "",
    "MARKET DATA:",
    `- Current price: $${stockData.currentPrice.toFixed(2)} ${stockData.currency}`,
    `- Daily change: ${changeDirection} $${Math.abs(stockData.dailyChange).toFixed(2)} (${stockData.dailyChangePercent.toFixed(2)}%)`,
    `- Open: $${stockData.open.toFixed(2)}`,
    `- High: $${stockData.high.toFixed(2)}`,
    `- Low: $${stockData.low.toFixed(2)}`,
    `- Previous close: $${stockData.previousClose.toFixed(2)}`,
    `- Volume: ${stockData.volume.toLocaleString()}`,
    `- Market cap: ${marketCapStr}`,
    `- 50-day moving average: ${maStr}`,
    maComparison,
    "",
    "Provide a data-driven analysis as a single JSON object.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildAnalysisPrompt(request: AIAnalysisRequest): {
  system: string;
  prompt: string;
} {
  return {
    system: buildSystemPrompt(),
    prompt: buildUserPrompt(
      request.ticker,
      request.analysisType,
      request.timeframe,
      request.stockData,
    ),
  };
}
