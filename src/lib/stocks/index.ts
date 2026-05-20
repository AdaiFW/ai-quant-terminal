/**
 * Stock-specific library utilities — constants, helpers, type guards.
 */

/** Major US market indices */
export const MAJOR_INDICES = [
  { ticker: "SPY", name: "S&P 500" },
  { ticker: "QQQ", name: "Nasdaq 100" },
  { ticker: "DIA", name: "Dow Jones" },
  { ticker: "IWM", name: "Russell 2000" },
] as const;

/** Market sectors */
export const SECTORS = [
  "Technology",
  "Healthcare",
  "Financials",
  "Energy",
  "Consumer Discretionary",
  "Communication Services",
  "Industrials",
  "Consumer Staples",
  "Utilities",
  "Real Estate",
  "Materials",
] as const;
