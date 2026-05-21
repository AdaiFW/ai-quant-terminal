# AI Quant Terminal

**Institutional AI-powered stock analysis and trading workstation.**

A professional quantitative trading terminal that combines real-time market data, advanced technical charts, and AI-driven structured analysis — inspired by TradingView, Bloomberg Terminal, Binance Pro, and Perplexity AI.

---

## 1. Project Overview

AI Quant Terminal is a production-grade financial analysis platform designed for professional traders and quant analysts. It replaces generic AI "chat about stocks" interfaces with a structured, signal-oriented analysis engine that produces machine-readable JSON output validated against strict schemas.

**Core workflow:**

```
Ticker input → Eastmoney real-time quote → TradingView K-line chart + 8 indicators
                                            ↘
                        DeepSeek AI analysis → Zod-validated JSON → Structured signals
                                            ↘
                                      Supabase persistence → audit trail
```

The platform covers US equities (NASDAQ/NYSE) and China A-shares (SSE/SZSE) through a unified Eastmoney data provider — no API key required, no rate limits.

---

## 2. Core Features

**Chart & Data**

- TradingView Lightweight Charts candlestick with volume
- 8 technical indicators: EMA 20/50, Bollinger Bands (20,2), VWAP, MACD (12/26/9), RSI (14)
- Multi-pane chart: candlestick + volume + MACD + RSI sub-panels
- Timeframe switcher: 1D / 1W / 1M / 3M / 1Y / ALL
- Real-time scrolling market ticker bar (16 tickers)
- 110+ stock watchlist with US/CN section filters
- Fear & Greed Index, Trending Stocks sidebar modules

**AI Quant Engine**

- Structured JSON output via DeepSeek V4 Pro + Vercel AI SDK
- Signal classification: Strong Buy / Buy / Neutral / Sell / Strong Sell
- 8 quantitative metrics: support, resistance, momentum, volume strength, volatility, risk score, sentiment, confidence
- Confidence score with animated progress bar
- AI prompt + response audit trail persisted to Supabase

**Terminal UI**

- Dark-only institutional color palette (#0A0E17 background)
- High-density multi-panel layout: watchlist | chart(70%) | AI panel
- Inter + JetBrains Mono typography with tabular financial numbers
- Framer Motion micro-animations, price flash on update
- Responsive to mobile viewports
- Bottom status bar: connection status, data source, real-time clock

---

## 3. Tech Stack

| Technology | Purpose | Why |
|------------|---------|-----|
| Next.js 15 | App Router framework | Server components, route handlers, edge middleware |
| TypeScript | Type safety | Strict mode, path aliases, zod inference |
| TailwindCSS | Styling | Utility-first, CSS variable theming, dark mode |
| shadcn/ui | UI primitives | Accessible, composable, tree-shakeable |
| Zustand | State management | Minimal boilerplate, terminal-wide shared state |
| Framer Motion | Animations | Price flash, panel transitions, loading states |
| TradingView Lightweight Charts | K-line chart | Canvas-based, institutional-grade, multi-pane |
| Supabase | Database + REST API | PostgreSQL with HTTPS access (no port exposure) |
| Prisma | Schema definition | Type-safe migrations, client generation |
| DeepSeek V4 Pro | AI inference | OpenAI-compatible, cost-effective, strong JSON output |
| Vercel AI SDK | Structured generation | `generateText` + zod schema validation |
| zod | Schema validation | Runtime type checking for all AI outputs |
| Eastmoney API | Market data | Free, no key, US + CN coverage, no rate limits |
| Recharts | Chart primitives | Lightweight SVG charts for auxiliary widgets |

---

## 4. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (Client)                         │
│  Terminal Shell → Zustand Store → React Components           │
│  ┌──────────┬──────────────────────┬──────────────────┐     │
│  │ Watchlist│ TradingView Chart     │ AI Quant Panel   │     │
│  │ Panel    │ + MACD/RSI sub-panes │ + Fear & Greed   │     │
│  │          │ + BB/VWAP/EMA overlay │ + Trending       │     │
│  └──────────┴──────────────────────┴──────────────────┘     │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS fetch
┌──────────────────────▼──────────────────────────────────────┐
│               Next.js Route Handlers (Server)                │
│  GET  /api/stocks/:ticker         → market-data.ts          │
│  GET  /api/stocks/:ticker/candles → eastmoney fetchKline()  │
│  POST /api/ai/analyze             → ai-analysis.ts          │
└──────┬───────────────────────────────┬──────────────────────┘
       │                               │
┌──────▼──────┐                 ┌──────▼──────────────────────┐
│  Eastmoney   │                 │  AI Pipeline                │
│  push2 API   │                 │  prompt → DeepSeek → zod   │
│  (free)      │                 │  → retry → JSON → store    │
└──────┬───────┘                 └──────┬──────────────────────┘
       │                               │
       └───────────┬───────────────────┘
                   │
           ┌───────▼────────┐
           │  Supabase       │
           │  stock_cache    │
           │  stock_analysis │
           │  ai_logs        │
           └────────────────┘
```

**Data flow:**

1. User types ticker → `GET /api/stocks/:ticker` → Eastmoney quote → normalize → cache → Supabase `stock_cache`
2. Candles load in parallel → Eastmoney K-line history → `CandlePoint[]` → TradingView chart render
3. User clicks "AI Analysis" → `POST /api/ai/analyze` → prompt assembly → `generateText` → `safeJSONParse` → `zod.parse` → retry loop → Supabase `stock_analysis` + `ai_logs`

---

## 5. AI Structured Output Design

The platform enforces **strict JSON output** from the LLM through a three-layer defense:

```
Layer 1: System prompt rules (10 constraints, no markdown, no hedging)
    ↓ (if LLM defies)
Layer 2: safeJSONParse — 9-step sanitization pipeline
    ↓ (if still invalid)
Layer 3: zod schema validation — rejects missing keys, wrong types, out-of-range values
    ↓ (if all fail)
Retry: exponential backoff × 3 attempts
```

**AI Output Schema (zod):**

```typescript
const aiAnalysisOutputSchema = z.object({
  summary:     z.string().min(50).max(600),
  sentiment:   z.enum(["Bullish", "Neutral", "Bearish"]),
  risk_level:  z.enum(["Low", "Medium", "High"]),
  confidence:  z.number().min(0).max(100),
  key_factors: z.array(z.string().min(5).max(200)).min(2).max(5),
});
```

**Why structured outputs matter for this domain:**
- Financial analysis requires **actionable signals**, not paragraphs
- Machine-readable JSON enables downstream automation (alerts, backtesting, dashboards)
- Strict schema prevents the LLM from hedging ("could go either way")
- Audit trail: every analysis is stored as structured JSON, queryable and comparable

**Safe JSON Parser — 9-step sanitization:**
The `safe-parser.ts` utility handles common LLM output failures:
1. Strip BOM
2. Extract \`\`\`json fenced blocks
3. Strip `//` comments
4. Strip `/* */` comments
5. Remove trailing commas
6. Replace `NaN`/`Infinity` → `null`
7. Convert single quotes → double quotes
8. Trim whitespace
9. `JSON.parse` → typed result or detailed error

---

## 6. Prompt Engineering

The prompt was iteratively refined from a generic "analyze this stock" instruction into a 10-rule system prompt that forces the LLM into a senior analyst persona with explicit output constraints.

**Production system prompt:**

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

**Key design choices:**
- **Role enforcement** ("senior financial analyst at a top-tier investment bank") — anchors the LLM in a professional persona, reducing casual/creative responses
- **Anti-hedging rule** (Rule 8) — specifically bans "however", "might", "could possibly" — the most common LLM hedging patterns in financial analysis
- **Numeric confidence** (Rule 9) — forces the model to quantify uncertainty rather than writing around it
- **Explicit JSON shape in prose** — backup guidance if structured output generation fails at the SDK level

---

## 7. UI/UX Design Philosophy

The interface follows institutional trading terminal conventions rather than SaaS dashboard patterns.

**Design influences:**

| Source | Applied to |
|--------|-----------|
| TradingView | Multi-pane chart as visual centerpiece, timeframe switcher, dark theme |
| Bloomberg Terminal | High data density, monospace typography, compact spacing, status bar |
| Binance Pro | Real-time ticker bar, buy/sell color semantics, order-book aesthetic |
| Perplexity AI | Structured AI output, signal badges instead of paragraphs |

**Key design decisions:**
- Chart occupies **70% width** — the visual hierarchy follows trader workflow (chart first, analysis second)
- **0px padding on chart** — every pixel displays data, no decorative whitespace
- **Monospace for all numbers** — tabular-nums ensure price columns align perfectly
- **Dark-only** — no light mode toggle; financial terminals are dark by convention
- **Thin 0.06-opacity borders** — information separation without visual noise

**Color system:**

```
Background:  #0A0E17    Bullish:  #00C087
Card:        #111827    Bearish:  #FF4D4F
Border:      rgba(255,255,255,0.06)    Primary:  #3B82F6
Text:        #E5E7EB    Secondary:      #94A3B8
```

---

## 8. Technical Indicators

All indicators are computed client-side from raw OHLCV candle data — no server round-trip needed for recalculation.

| Indicator | Parameters | Implementation | Location |
|-----------|-----------|---------------|----------|
| EMA | 20, 50 periods | `calcEMA()` — exponential smoothing | Main chart overlay |
| Bollinger Bands | 20 period, 2 std dev | `calcBollinger()` — SMA ± k·σ | Main chart overlay |
| VWAP | Cumulative | `calcVWAP()` — Σ(TP·V)/ΣV | Main chart overlay |
| MACD | 12/26/9 | `calcMACD()` — EMA₁₂−EMA₂₆, signal, histogram | Sub-pane (120px) |
| RSI | 14 period | `calcRSI()` — Wilder's smoothing | Sub-pane (90px, 70/30 lines) |
| Volume | — | Histogram series, red/green per candle | Main chart bottom 22% |

---

## 9. Debugging Records

Real issues encountered and resolved during development.

### 9.1 `chart.series is not a function`

- **Problem:** `chart.series()` returned `undefined` on lightweight-charts v5.2.0
- **Root cause:** API breaking change from v4 to v5 — `addCandlestickSeries()` → `addSeries(CandlestickSeries, opts)`, and `chart.series()` was removed from the public API
- **AI-assisted debugging:** Claude Code identified the version mismatch by checking `package.json` against the installed typings
- **Solution:** Destroy and recreate chart on data change instead of manipulating series references. Added `transpilePackages: ["lightweight-charts"]` to `next.config.ts` for ESM compatibility
- **Lesson:** Canvas-based chart libraries have fragile internal APIs; recreate-on-update is more reliable than incremental manipulation

### 9.2 `calcEMA` Produced Sparse Arrays

- **Problem:** `Cannot read properties of undefined (reading 'time')` crash on chart render
- **Root cause:** `calcEMA()` used `result[period-1] = value` then `result.push()`, creating holes at indices 0..18 (undefined elements). The chart code mapped these to `candles[idx]` assuming a dense array
- **Solution:** Refactored all calc functions to return `{idx: number, value: number}[]` objects instead of sparse arrays
- **Lesson:** TypeScript's `number[]` type doesn't catch sparse arrays; defensive coding with explicit index tracking prevents silent failures

### 9.3 Hydration Mismatch

- **Problem:** "Hydration failed because the server rendered HTML didn't match the client"
- **Root cause:** `StatusBar` rendered `new Date().toLocaleTimeString()` during SSR, producing different output on client
- **Solution:** Deferred time display to `useEffect` + `setInterval` (client-only), added `suppressHydrationWarning` to animated ticker bar
- **Lesson:** Any component using browser APIs (Date, window, animation) must gate behind client-side mount

### 9.4 Eastmoney US K-line Connection Failure

- **Problem:** US stock K-line API returned `fetch failed`, CN stocks worked fine
- **Root cause:** The main `push2his.eastmoney.com` host had intermittent DNS/routing issues; different subdomains route to different CDN nodes
- **AI-assisted debugging:** Tested multiple subdomain patterns via `curl`, found that randomized `N.push2his.eastmoney.com` (1-99) resolved the issue
- **Solution:** `klineUrl()` generates random subdomain for each request, providing load-balanced access
- **Lesson:** Free Chinese financial APIs use CDN sharding; single-hostname access is unreliable

### 9.5 Finnhub Rate Limiting (60 req/min)

- **Problem:** US stock data intermittently returned 500 errors after ~5 queries
- **Root cause:** Finnhub free tier limits to 60 API calls/minute; frontend made 2 calls per ticker (quote + candles), exhausting quota quickly
- **Solution:** Migrated all data fetching to Eastmoney (no rate limits, broader coverage). Deleted Finnhub and Alpha Vantage providers entirely
- **Lesson:** Free tier API limits are incompatible with interactive dashboards; prefer unlimited data sources for real-time UX

### 9.6 Prisma Direct Connection Blocked (GFW)

- **Problem:** `prisma migrate dev` failed with `P1001: Can't reach database server`
- **Root cause:** PostgreSQL port 5432 blocked at network level; HTTPS port 443 accessible
- **Solution:** Switched from Prisma direct connection to Supabase JS client (`@supabase/supabase-js`) which communicates via HTTPS REST API. Tables created via Supabase SQL Editor in browser
- **Lesson:** In restricted network environments, prefer HTTPS-based database access over raw TCP connections

---

## 10. Performance Optimizations

- **Chart recreation on data change** — destroying and recreating the chart is faster than incrementally removing and re-adding 15+ series with pane management
- **Zustand selector pattern** — components subscribe to individual state slices, preventing re-renders from unrelated state changes
- **In-memory TTL cache** — stock quotes cached for 60 seconds, candles for 5 minutes, reducing API calls on repeated ticker views
- **Dynamic imports** — provider modules (`eastmoney.ts`) are dynamically imported only when needed
- **CSS variable theming** — theme changes via CSS custom properties without JavaScript recalculations
- **Canvas-based chart** — TradingView Lightweight Charts render on Canvas, offloading from the DOM

---

## 11. Future Improvements

- **WebSocket real-time market data** — replace polling with push-based price updates for live ticker bar and chart animation
- **Multi-agent AI analysis** — parallel agents for technical, fundamental, sentiment, and macro analysis with ensemble signal aggregation
- **Portfolio tracking** — persisted Supabase-backed watchlists with P&L calculation
- **AI backtesting engine** — replay historical data through AI analysis pipeline to evaluate signal accuracy
- **Options analytics chain** — Greeks visualization, implied volatility surface
- **Institutional order flow analysis** — large-order detection, dark pool tracking
- **Notification system** — price alerts, signal change alerts, confidence threshold triggers

---

## 12. Local Development Setup

```bash
# Clone and install
git clone <repo-url>
cd ai-stock-platform
npm install

# Environment
cp .env.example .env.local
# Edit .env.local with your keys:
#   DEEPSEEK_API_KEY="sk-..."         (https://platform.deepseek.com)
#   NEXT_PUBLIC_SUPABASE_URL="https://..."  (Supabase project URL)
#   NEXT_PUBLIC_SUPABASE_ANON_KEY="..."     (Supabase anon key)
#   DATABASE_URL="postgresql://..."         (Supabase connection string)

# Database setup (run in Supabase SQL Editor)
# Execute: supabase-init.sql

# Start dev server
./node_modules/.bin/next dev --port 3000
# → http://localhost:3000
```

---

## 13. Deployment Guide

### Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Run `supabase-init.sql` in SQL Editor to create tables
3. Copy project URL and anon key to environment variables

### Render.com

1. Push code to GitHub
2. Render Dashboard → New → Web Service → connect repo
3. Build command: `npm install && npx prisma generate && npm run build`
4. Start command: `npm start`
5. Add all environment variables in Render Dashboard → Environment

### Environment Variables

| Variable | Required | Purpose |
|----------|:--------:|---------|
| `DEEPSEEK_API_KEY` | Yes | AI analysis model |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase public key |
| `DATABASE_URL` | No* | Prisma connection (Supabase client works without it) |
| `AI_MODEL` | No | Default: `deepseek-chat` |

---

## 14. Online Demo

- **GitHub:** `<repository-url>`
- **Live Demo:** `<deployed-url>`

---

*Built with Next.js 15, TypeScript, DeepSeek V4 Pro, TradingView Lightweight Charts, and Supabase.*
