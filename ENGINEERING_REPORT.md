# Engineering Report: AI Quant Terminal

**A production-grade AI-powered institutional trading workstation.**

**Author:** AdaiFW
**Repository:** [github.com/AdaiFW/ai-quant-terminal](https://github.com/AdaiFW/ai-quant-terminal)
**Deployment:** Via Render.com + Supabase

---

## 1. Project Introduction

### 1.1 What This Is

AI Quant Terminal is a professional financial analysis platform that combines real-time multi-market stock data, institutional-grade technical charting, and AI-driven structured quantitative analysis into a single high-density trading workstation.

### 1.2 Design Philosophy

The platform was designed by answering one question:

> *"What would an institutional AI trading terminal look like if it were built by a quant engineer rather than a product designer?"*

The answer drove every architectural decision:

- **Chart-first layout** — the candlestick chart occupies 70% of the viewport because traders make decisions visually, not by reading paragraphs
- **Structured AI signals** — the AI produces JSON, not prose, because quantitative analysis requires machine-readable outputs
- **No chat interface** — AI is a signal generator embedded in the workflow, not a conversational assistant
- **Dark-only, high-density** — follows Bloomberg Terminal conventions of information density over visual breathing room

### 1.3 Core Workflow

```
Ticker input → Eastmoney real-time quote → TradingView K-line chart (8 indicators)
                                            ↘
                        DeepSeek V4 Pro → Structured JSON → 8 quant metrics
                                            ↘
                                    Supabase → stock_cache + stock_analysis + ai_logs
```

### 1.4 Market Coverage

The platform covers **US equities** (NASDAQ/NYSE) and **China A-shares** (SSE/SZSE) through a single unified Eastmoney data provider. No API key required. No rate limits.

---

## 2. Complete Tech Stack

### 2.1 Frontend

| Technology | Version | Purpose | Selection Rationale |
|------------|---------|---------|---------------------|
| Next.js | 15.2 | App Router framework | Server components for API routes, RSC streaming, Edge middleware. Next.js 15's partial prerendering enables hybrid static/dynamic rendering for the dashboard. |
| TypeScript | 5.7 | Type safety | Strict mode with 7 path aliases (`@components/`, `@lib/`, etc.). All AI outputs are typed via zod inference. |
| TailwindCSS | 3.4 | Utility-first CSS | CSS variable theming enables dark-only mode with `hsl(var(--xxx))` pattern. No runtime CSS-in-JS overhead. |
| shadcn/ui | New York style | UI primitive library | Copy-paste components, fully owned code. No npm dependency for UI components — tree-shakeable by design. |
| Zustand | 5.x | State management | 2KB bundle, no Provider wrapper, selector-based subscriptions prevent re-render cascades. Terminal-wide shared state (active ticker, candles, AI data) with 10 typed actions. |
| Framer Motion | 11.x | Micro-animations | Price flash on update, panel transitions, loading states. `AnimatePresence` for enter/exit animations without layout thrashing. |
| TradingView Lightweight Charts | 5.2 | K-line charting | Canvas-based rendering (no DOM nodes per candle). Multi-pane support for MACD/RSI sub-charts. < 40KB gzipped. MIT license. |
| Recharts | 2.15 | Auxiliary SVG charts | Used only for Fear & Greed Index and non-realtime widgets where Canvas is unnecessary. |
| `clsx` + `tailwind-merge` | — | Class composition | `cn()` utility prevents className conflicts. |

### 2.2 Backend & Data

| Technology | Purpose | Selection Rationale |
|------------|---------|---------------------|
| Eastmoney API | Market data | Free, no key, zero rate limits. Covers US + CN markets through a single provider. Eliminated multi-provider complexity (removed Finnhub and Alpha Vantage after rate-limit issues). |
| Supabase | Database + API | PostgreSQL with HTTPS REST API. Chosen over raw PostgreSQL because HTTPS port 443 is universally accessible (GFW compatibility). JS client library handles auth, real-time subscriptions, and row-level security. |
| Prisma | Schema definition | `schema.prisma` serves as the single source of truth for the data model. Prisma Client is generated for type safety but runtime data access uses Supabase JS client for HTTPS compatibility. |
| DeepSeek V4 Pro | AI inference | OpenAI-compatible API at ~1/10th the cost. Native JSON output support. Strong performance on structured generation tasks. |
| Vercel AI SDK | AI orchestration | `generateText()` + zod schema integration. Handles streaming, retry, and token counting. |

### 2.3 Validation & Tooling

| Technology | Purpose |
|------------|---------|
| zod | Runtime schema validation for all AI outputs and API inputs |
| ESLint | Flat config with Next.js + TypeScript + Tailwind rules |
| Prettier | Code formatting with `prettier-plugin-tailwindcss` |
| Playwright | End-to-end browser testing (headless Chromium) |
| `fetchWithRetry` | Custom HTTP client with exponential backoff (3 attempts, 1s base) |
| `withCache` | In-memory TTL cache (60s stocks, 300s candles) |

---

## 3. Prompt Engineering

### 3.1 Design Strategy

The prompt was iteratively refined from a generic "analyze this stock" into a 10-rule system prompt that enforces structured output, prevents hedging, and anchors the LLM in a professional analyst persona.

**Iteration history:**

| Version | Problem | Fix |
|---------|---------|-----|
| v1 | LLM returned paragraphs of text | Added "Return ONLY valid JSON" rule |
| v2 | LLM hedged: "could go either way" | Banned hedging words explicitly (Rule 8) |
| v3 | LLM used wrong JSON keys | Listed allowed keys in prose (Rule 10) |
| v4 | Confidence scores were unreasonably high (90-95) | Added Rule 9: lower confidence when data is insufficient |
| v5 (Production) | 3-layer defense: prompt → safeJSONParse → zod retry | Current system |

### 3.2 Production System Prompt

```
You are a senior financial analyst at a top-tier investment bank.
Your analysis is precise, data-driven, and decisive.

RULES:
1. Return ONLY valid JSON — no markdown, no preamble, no code fences.
2. Commit to a single sentiment: Bullish, Neutral, or Bearish.
3. Choose exactly one risk level: Low, Medium, or High.
4. Confidence must be an integer between 0 and 100.
5. Provide exactly 3-5 key factors, each 5-200 characters.
6. Summary must be 50-600 characters.
7. Base your analysis on the provided data, not generic knowledge.
8. Do not use hedging words: avoid 'however', 'might', 'could possibly'.
9. If data is insufficient to be confident, lower your confidence score.
10. Use only the JSON keys specified.
```

### 3.3 Prompt Architecture

The user prompt injects structured stock market data directly into the LLM context:

```
Analyze AAPL stock.
Analysis type: COMPREHENSIVE. Timeframe: DAILY.

MARKET DATA:
- Current price: $298.97 USD
- Daily change: up $1.13 (0.38%)
- Open: $296.97
- High: $300.51
- Low: $296.35
- Previous close: $297.84
- Volume: 52,413,600
- Market cap: 4,391.08B
- 50-day moving average: $188.45
Trading ABOVE 50-day MA — bullish signal.

Provide a data-driven analysis as a single JSON object.
```

**Key design choices in the user prompt:**

- **Numerical precision** — prices formatted to 2 decimal places, volume with separators, market cap in billions. These are interpretation aids for the LLM.
- **Directional signals computed server-side** — "Trading ABOVE 50-day MA — bullish signal" pre-computes the MA comparison rather than asking the LLM to calculate it
- **Empty-state handling** — when MA is unavailable, the line is omitted entirely rather than showing "N/A", reducing noise

---

## 4. Structured Output Engineering

### 4.1 The Reliability Problem

LLMs are non-deterministic. Even with explicit instructions, they produce:

- Markdown-wrapped JSON (` ```json { ... } ``` `)
- Trailing commas (`{"a": 1,}`)
- Single-quoted strings
- JavaScript comments in JSON
- `NaN` / `Infinity` literals
- Wrong keys, wrong types, out-of-range values

In a financial application, a single malformed response breaks the entire pipeline. The system must be **reliable, not probabilistic**.

### 4.2 Three-Layer Defense Architecture

```
┌─────────────────────────────────────────────────────────┐
│ LAYER 1: System Prompt                                  │
│ 10 explicit rules constraining output format            │
│ "Return ONLY valid JSON — no markdown, no preamble"     │
├─────────────────────────────────────────────────────────┤
│ LAYER 2: safeJSONParse (9-step sanitization)            │
│ 1. Strip BOM     2. Extract ```json fences              │
│ 3. Strip //       4. Strip /* */                        │
│ 5. Remove trailing commas                               │
│ 6. NaN/Infinity → null                                  │
│ 7. Single quotes → double quotes                        │
│ 8. Trim whitespace                                      │
│ 9. JSON.parse → { ok: true, data } | { ok: false, error }│
├─────────────────────────────────────────────────────────┤
│ LAYER 3: zod.safeParse                                  │
│ Strict schema: exact keys, exact types, exact ranges     │
│ Rejects: missing keys, wrong types, extra properties     │
├─────────────────────────────────────────────────────────┤
│ RETRY: withRetry({ maxAttempts: 3, strategy: exponential })│
│ Only retries on transient errors (timeout, network, 429) │
│ Does NOT retry on schema errors (the contract is fixed)  │
└─────────────────────────────────────────────────────────┘
```

### 4.3 AI Output Schema (zod)

```typescript
const aiAnalysisOutputSchema = z.object({
  summary: z.string().min(50).max(600)
    .describe("Concise analysis summary"),
  sentiment: z.enum(["Bullish", "Neutral", "Bearish"])
    .describe("Overall market sentiment"),
  risk_level: z.enum(["Low", "Medium", "High"])
    .describe("Risk assessment"),
  confidence: z.number().min(0).max(100)
    .describe("Confidence score 0-100"),
  key_factors: z.array(z.string().min(5).max(200))
    .min(2).max(5)
    .describe("Key driving factors"),
});
```

### 4.4 Validation Pipeline Code

```typescript
// src/lib/ai/validation/validator.ts
export async function generateValidatedObject<T>({ model, schema, system, prompt }) {
  const { result, attempts } = await withRetry(async () => {
    const res = await generateText({ model, system, prompt, temperature: 0.1 });
    const text = res.text || "";

    // Layer 2: Safe parse
    const parsed = safeJSONParse<T>(text);
    if (!parsed.ok) throw new Error(`JSON parse failed: ${parsed.error}`);

    // Layer 3: Zod validation
    const zodResult = schema.safeParse(parsed.data);
    if (!zodResult.success) {
      const issues = zodResult.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      throw new Error(`Schema validation failed: ${issues}`);
    }

    return { data: zodResult.data, warnings: parsed.warnings };
  }, { maxAttempts: 3, strategy: "exponential" });

  return { data: result.data, meta: { attempts, ... } };
}
```

### 4.5 Why Structured Outputs Matter for Financial AI

- **Actionable signals** — "Bullish, Medium Risk, Confidence 72" is a trading signal. A 200-word paragraph is not.
- **Auditability** — every analysis is stored as structured JSON in Supabase. Queryable. Comparable over time.
- **Downstream automation** — structured signals can feed into alerting, backtesting, portfolio rebalancing without additional NLP
- **Reliability measurement** — structured outputs enable quantitative evaluation: how often did the signal match the outcome?

---

## 5. Debug Records

### 5.1 `chart.series is not a function` (Critical)

**Problem:** Chart failed to render after switching tickers. Browser console: `TypeError: chart.series is not a function`.

**Root cause:** lightweight-charts v5.2.0 removed `chart.series()` from the public API and changed `addCandlestickSeries()` to `addSeries(CandlestickSeries, opts)`. The code was written against the v4 API.

**AI-assisted debugging:** Claude Code identified the version mismatch by checking `package.json` (`^5.0.0`) against the installed version (`5.2.0`) and the type definitions, which showed `series()` was not in the public interface.

**Solution:** Replaced incremental series manipulation with destroy-and-recreate strategy. The `useEffect` for candle data now removes the old chart and creates a fresh one. Added `transpilePackages: ["lightweight-charts"]` to `next.config.ts` for ESM interop.

**Lesson:** Canvas-based chart libraries with frequent API changes benefit from recreate-on-update patterns, which are simpler and more reliable than incremental manipulation.

---

### 5.2 `calcEMA` Sparse Array (Critical)

**Problem:** `Cannot read properties of undefined (reading 'time')` — chart crash on any ticker selection.

**Root cause:** `calcEMA()` used `result[period - 1] = value` to set the first EMA element, followed by `result.push()` for subsequent values, creating a sparse array with `undefined` at indices 0 through 18. The chart data mapper treated array indices as candle indices: `ema20.map((v, i) => ({ time: candles[i].date, value: v }))` — mapping `candles[0]` to `undefined` value.

**AI-assisted debugging:** The error message was ambiguous ("Cannot read properties of undefined (reading 'time')"). Claude Code traced the data flow from API response → calculation → chart series, identifying that `calcEMA` returned sparse arrays while `calcRSI` and `calcBollinger` returned dense `{idx, value}[]` objects.

**Solution:** Refactored all `calc*` functions to a consistent `{ idx: number; value: number }[]` return type. Chart data mapping changed from position-based (`candles[i]`) to index-based (`candles[d.idx]`). Applied to EMA, MACD, and EMA-of-MACD computations.

**Lesson:** TypeScript's `number[]` type provides no warning for sparse arrays. Consistent `{idx, value}[]` patterns with explicit index tracking are safer than position-based mapping for computed indicator arrays.

---

### 5.3 Hydration Mismatch (Minor)

**Problem:** React hydration warning: "server rendered HTML didn't match the client."

**Root cause:** (1) `StatusBar` called `new Date().toLocaleTimeString()` during SSR, producing different output on client. (2) Ticker bar's `animate-scroll-x` CSS animation positioned elements differently after client-side animation started.

**AI-assisted debugging:** Claude Code identified both sources by inspecting the component tree for time-dependent and animation-dependent rendering.

**Solution:** (1) Deferred time display to `useEffect` + `setInterval` with initial empty string state. (2) Added `suppressHydrationWarning` to the ticker bar container — appropriate since the content is identical and only the animation offset differs.

**Lesson:** Any component touching `Date`, `window`, or CSS animations must be gated behind client-side render to prevent hydration mismatches.

---

### 5.4 Eastmoney US K-line DNS Failure (Critical)

**Problem:** US stock K-line API returned `fetch failed`, but CN stocks worked fine. Same endpoint, different market code.

**Root cause:** The main `push2his.eastmoney.com` hostname resolved intermittently from the user's network. Eastmoney uses numbered subdomains (`1.push2his.eastmoney.com` through `99.push2his.eastmoney.com`) for CDN load balancing, and the root domain's DNS routing was unreliable.

**AI-assisted debugging:** Claude Code tested multiple URL patterns via `curl`, discovering that `89.push2his.eastmoney.com` resolved correctly while the root domain did not. This led to the randomized subdomain solution.

**Solution:** `klineUrl()` generates a random subdomain (1-99) for each K-line request, distributing requests across CDN nodes and avoiding the unreliable root domain.

**Lesson:** Chinese CDN-based APIs often use numbered subdomains for sharding. Single-hostname resolution is a single point of failure. Randomization provides built-in load balancing and fault tolerance.

---

### 5.5 Finnhub Rate Limiting (Critical)

**Problem:** US stock data returned 500 errors after approximately 5 queries. Dashboard became unusable.

**Root cause:** Finnhub free tier limits to 60 API calls/minute. The dashboard made 2 calls per ticker (quote + candles), each page interaction triggered new requests, exhausting the quota within seconds.

**AI-assisted debugging:** Claude Code instrumented the API layer with response status logging, revealing the 429 rate limit pattern. The solution involved evaluating alternative data providers.

**Solution:** Migrated all data fetching to Eastmoney (free, no key, no rate limits, broader market coverage). Deleted Finnhub and Alpha Vantage providers entirely. Simplified `resolveProvider()` to a single path.

**Lesson:** Free-tier API rate limits are fundamentally incompatible with interactive dashboards. When selecting a data provider, rate limits should be the primary criterion — ahead of data quality, documentation, or SDK quality.

---

### 5.6 PostgreSQL Port Blocked (Infrastructure)

**Problem:** `prisma migrate dev` failed with `P1001: Can't reach database server at aws-0-us-east-1.pooler.supabase.com:5432`.

**Root cause:** Network-level block on TCP port 5432 (PostgreSQL). HTTPS port 443 was accessible.

**AI-assisted debugging:** Claude Code tested TCP connectivity to multiple Supabase endpoints (`nc -zv`, `curl`), isolating the issue to protocol-level filtering rather than DNS or authentication failures.

**Solution:** Migrated from Prisma direct connection to Supabase JS client (`@supabase/supabase-js`), which communicates via HTTPS REST API on port 443. Database tables created via Supabase SQL Editor (browser-based, HTTPS). Prisma retained for schema definition and type generation only.

**Lesson:** In restricted network environments, prefer application-layer database access (HTTPS REST/GraphQL) over transport-layer connections (TCP). Supabase's dual access model (direct PostgreSQL + REST API) proved essential for deployment flexibility.

---

### 5.7 Duplicate JSX Element (Compilation)

**Problem:** Build failed with `Unexpected token div. Expected jsx identifier`.

**Root cause:** When adding the search form to the toolbar, a duplicate `<div>` opening tag was inadvertently introduced (two identical timeframe container divs). TSC flagged "JSX element 'div' has no corresponding closing tag."

**AI-assisted debugging:** Claude Code used `grep -n "</?\<div"` to count opening vs. closing `<div>` tags and identified the duplicate at line 223.

**Solution:** Removed duplicate opening tag. Added `tsc --noEmit` check to development workflow to catch JSX structural errors before runtime.

**Lesson:** For JSX-heavy files, automated tag counting is faster than manual visual inspection. A pre-commit `tsc --noEmit` step would have caught this before runtime.

---

## 6. Frontend Architecture

### 6.1 Component Hierarchy

```
TerminalPage
├── TickerBar                    (scrolling market data, pure display)
├── [Main Grid]
│   ├── WatchlistPanel           (110+ stocks, US/CN sections, filter search)
│   ├── [Center: Chart + Toolbar]
│   │   ├── Toolbar              (ticker display, search input, timeframes, AI button)
│   │   └── Chart                (TradingView Canvas, 8 indicators, multi-pane)
│   │       ├── Candlestick series
│   │       ├── EMA 20 + EMA 50 overlay
│   │       ├── Bollinger Bands overlay
│   │       ├── VWAP overlay
│   │       ├── Volume histogram
│   │       ├── MACD pane (histogram + signal line)
│   │       └── RSI pane (70/30 threshold lines)
│   └── AI Quant Panel           (8 quant metrics, signal badge, confidence bar)
│       ├── FearGreedIndex       (5-segment scale)
│       └── TrendingStocks       (6 tickers with change + volume)
└── StatusBar                    (connection, data source, real-time clock)
```

### 6.2 State Architecture (Zustand)

```typescript
interface TerminalState {
  activeTicker: string;         // Currently selected ticker
  tickerData: StockQuote | null; // Real-time quote data
  candles: CandlePoint[];       // OHLCV history (155 days)
  aiData: AIQuantData | null;   // Structured AI analysis
  watchlist: string[];           // 110+ curated tickers
  tickerBar: TickerItem[];       // Scrolling bar data (16 tickers)
  timeframe: string;             // 1D/1W/1M/3M/1Y/ALL

  // Actions (10 total)
  setActiveTicker, setTickerData, setCandles, setAIData,
  setWatchlist, setTickerBar, setTimeframe, setLoading, setAnalyzing
}
```

**Design rationale:**
- Single store instead of multiple contexts — terminal state is inherently global (which ticker is active, what data is loaded)
- Selector-based subscriptions — components only re-render when their subscribed slice changes
- No async actions in store — API calls live in `useCallback` hooks in the page component, keeping the store synchronous and predictable

### 6.3 Chart Rendering Strategy

The chart follows a **destroy-and-recreate** pattern on data change:

```
useEffect(() => {
  // 1. Destroy old chart
  chartApiRef.current?.remove();

  // 2. Create new chart with container dimensions
  const chart = createChart(container, { width, height });

  // 3. Add all series with new data
  chart.addSeries(CandlestickSeries, opts).setData(candles);
  chart.addSeries(LineSeries, opts).setData(ema20);
  // ... 15+ series

  // 4. ResizeObserver for responsive layout
  new ResizeObserver(() => chart.applyOptions({ width, height }))
    .observe(container);

  // 5. Cleanup on unmount
  return () => chart.remove();
}, [candles]);
```

This approach was chosen over incremental series manipulation because lightweight-charts v5 API changes made `chart.series()` and `chart.removeSeries()` unreliable for clearing 15+ series.

### 6.4 Data Flow

```
User Action → Zustand Store Update → React Re-render → useEffect → API Call → Store Update → Chart Re-render
                                                                                      → AI Panel Update
```

Each ticker selection triggers two parallel API calls (`Promise.all`) for quote and candle data. AI analysis is triggered explicitly by button click (not automatic) to avoid unnecessary LLM costs.

---

## 7. UI/UX Design Philosophy

### 7.1 Design References

| Source | Applied To |
|--------|-----------|
| TradingView | Multi-pane chart as visual centerpiece, timeframe switcher, candlestick color semantics |
| Bloomberg Terminal | High data density, monospace financial typography, compact toolbar, status bar |
| Binance Pro | Real-time ticker bar, buy/sell color system, order-book visual language |
| Perplexity AI | Structured AI output with signal badges instead of text blocks |

### 7.2 Visual Hierarchy

The layout follows institutional trader workflow:

```
1. Ticker Bar     (context — what's the market doing?)
2. Watchlist       (navigation — what do I want to look at?)
3. K-line Chart    (decision — what's the price action?)
4. AI Quant Panel  (confirmation — what does the AI think?)
5. Status Bar      (infrastructure — is the system healthy?)
```

### 7.3 Color System

```
Background:  #0A0E17 (deep navy — reduces eye strain, standard in trading floors)
Surface:     #111827 (cards, panels)
Border:      rgba(255,255,255,0.06) (barely visible, information separation without noise)
Bullish:     #00C087 (green-cyan — distinct from standard green, premium feel)
Bearish:     #FF4D4F (warm red — immediate attention without harshness)
Primary:     #3B82F6 (muted blue — professional, not decorative)
Text:        #E5E7EB (near-white — high contrast on dark background)
Muted:       #94A3B8 (cool gray — secondary information)
```

### 7.4 Typography

- **Inter** — UI text, headers, labels (clean geometric sans-serif)
- **JetBrains Mono** — all numerical data, ticker codes, prices (monospace with `tabular-nums` for perfect column alignment)

---

## 8. Performance Optimizations

### 8.1 Chart Strategy
- Canvas-based rendering (TradingView Lightweight Charts) — no DOM nodes per candle, critical for 155-point datasets with 8 indicator overlays

### 8.2 State Management
- Zustand selector pattern — component subscribes to individual state slices, avoiding re-renders from unrelated updates
- `useCallback` for event handlers — stable function references across renders

### 8.3 Data Fetching
- In-memory TTL cache — stock quotes 60s, candles 300s
- `Promise.all` for parallel quote + candle fetches
- Dynamic `import()` for provider modules — code-split by market

### 8.4 Build Optimization
- `transpilePackages` for ESM-only libraries (lightweight-charts, framer-motion, zustand)
- `optimizePackageImports` for icon libraries and UI packages

---

## 9. Future Improvements

### 9.1 Near-term (1-2 months)
- **WebSocket real-time data** — replace poll-based ticker bar with push-based price updates via Supabase Realtime
- **Price alerts** — user-defined threshold notifications via browser Notification API
- **Watchlist persistence** — currently in Zustand store (volatile); migrate to Supabase-backed user data

### 9.2 Medium-term (3-6 months)
- **Multi-agent AI analysis** — parallel agents for technical, fundamental, and sentiment analysis with ensemble signal aggregation
- **AI backtesting engine** — replay historical K-line data through the AI pipeline to quantitatively evaluate signal accuracy over time
- **Portfolio P&L tracking** — persisted positions with realized/unrealized gain calculation

### 9.3 Long-term (6-12 months)
- **Institutional order flow analysis** — large-order detection, dark pool activity monitoring
- **Options chain analytics** — Greeks visualization, implied volatility surface
- **Natural language query** — "show me stocks with RSI < 30 and volume > 2x average" — as an optional complement to structured analysis

---

*Engineering report for the AI Quant Terminal project. Designed and built with Claude Code, DeepSeek V4 Pro, and a production-first engineering mindset.*
