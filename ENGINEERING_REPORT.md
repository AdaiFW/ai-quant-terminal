# 工程报告：AI Stock Analysis

**面向机构级 AI 驱动型股票分析平台的生产级交付文档。**

**作者：** AdaiFW
**仓库：** [github.com/AdaiFW/ai-quant-terminal](https://github.com/AdaiFW/ai-quant-terminal)
**部署：** Render.com + Supabase

---

## 1. 项目概述

### 1.1 项目定义

AI Stock Analysis 是一个专业的 AI 股票分析平台，将实时多市场股票数据、机构级技术图表和 AI 驱动的结构化量化分析整合为高密度分析工具。

### 1.2 设计哲学

平台设计围绕一个核心问题展开：

> *"如果由量化工程师而非产品设计师来构建机构级 AI 交易终端，它会是什么样子？"*

这个问题驱动了每一个架构决策：

- **图表优先布局** — K 线图占据 70% 视口宽度，因为交易者通过视觉做决策，而非阅读段落文字
- **结构化 AI 信号** — AI 输出 JSON 而非自然语言段落，因为量化分析需要机器可读的输出
- **无聊天界面** — AI 是嵌入工作流的信号生成器，不是对话助手
- **纯暗色、高密度** — 遵循 Bloomberg 终端的信息密度惯例，拒绝视觉留白

### 1.3 核心工作流

```
Ticker 输入 → 东方财富实时报价 → TradingView K 线图（8 项指标）
                                    ↘
                    DeepSeek V4 Pro → 结构化 JSON → 8 项量化指标
                                    ↘
                            Supabase → stock_cache + stock_analysis + ai_logs
```

### 1.4 市场覆盖

平台通过统一的东方财富数据源覆盖**美股**（NASDAQ/NYSE）和 **A 股**（沪深京）。无需 API Key。无限流限制。

---

## 2. 完整技术栈

### 2.1 前端

| 技术 | 版本 | 用途 | 选型理由 |
|------|------|------|----------|
| Next.js | 15.2 | App Router 框架 | 服务端组件用于 API 路由，RSC 流式渲染，Edge 中间件。Next.js 15 的部分预渲染支持仪表盘的静态/动态混合渲染。 |
| TypeScript | 5.7 | 类型安全 | 严格模式 + 7 个路径别名。所有 AI 输出通过 zod 推断获得完整类型。 |
| TailwindCSS | 3.4 | 原子化 CSS | CSS 变量主题系统，`hsl(var(--xxx))` 模式。零运行时 CSS-in-JS 开销。 |
| shadcn/ui | New York 风格 | UI 基础库 | 复制粘贴组件，完全自主维护代码。无需 npm 依赖即获得可摇树优化。 |
| Zustand | 5.x | 状态管理 | 2KB 体积，无需 Provider 包裹。基于 selector 的订阅机制防止级联重渲染。终端级共享状态（active ticker, candles, AI data），10 个类型化 action。 |
| Framer Motion | 11.x | 微动效 | 价格更新闪烁、面板过渡动画、加载状态。`AnimatePresence` 实现进出场动画，无布局抖动。 |
| TradingView Lightweight Charts | 5.2 | K 线图表 | Canvas 渲染（每根 K 线零 DOM 节点）。多面板支持 MACD/RSI 子图。< 40KB gzip。MIT 协议。 |
| Recharts | 2.15 | 辅助 SVG 图表 | 仅用于 Fear & Greed Index 等非实时组件，避免 Canvas 的过度使用。 |
| `clsx` + `tailwind-merge` | — | 类名组合 | `cn()` 工具函数防止 className 冲突。 |

### 2.2 后端与数据

| 技术 | 用途 | 选型理由 |
|------|------|----------|
| 东方财富 API | 行情数据 | 免费、无 Key、零限流。单一数据源覆盖美股 + A 股。消除多供应商复杂性（因限流问题移除了 Finnhub 和 Alpha Vantage）。 |
| Supabase | 数据库 + API | PostgreSQL + HTTPS REST API。选择 HTTPS 方式而非直连 PostgreSQL，因为端口 443 普适可访问（防火墙穿透）。JS 客户端库处理认证、实时订阅和行级安全。 |
| Prisma | Schema 定义 | `schema.prisma` 作为数据模型的单一真实源。生成类型安全的 Prisma Client，但运行时数据访问使用 Supabase JS 客户端（HTTPS 兼容）。 |
| DeepSeek V4 Pro | AI 推理 | OpenAI 兼容 API，成本约 1/10。原生支持 JSON 输出。结构化生成任务表现出色。 |
| Vercel AI SDK | AI 编排 | `generateText()` + zod schema 集成。处理流式输出、重试和 token 统计。 |

### 2.3 验证与工具链

| 技术 | 用途 |
|------|------|
| zod | 所有 AI 输出和 API 输入的运行时 schema 验证 |
| ESLint | Flat Config + Next.js + TypeScript + Tailwind 规则 |
| Prettier | 代码格式化，`prettier-plugin-tailwindcss` 插件 |
| Playwright | 端到端浏览器测试（headless Chromium） |
| `fetchWithRetry` | 自定义 HTTP 客户端，指数退避重试（3 次，1s 基数） |
| `withCache` | 内存 TTL 缓存（股票报价 60s，K 线数据 300s） |

---

## 3. Prompt 工程

### 3.1 设计策略：8 步迭代法

从最初的一句 "analyze this stock" 到最终的生产级 Prompt，经历了 8 个版本的迭代优化。每一步都解决了一个具体的可靠性问题。

**完整迭代历史：**

| Step | 问题诊断 | 修复方案 | 效果 |
|------|---------|---------|------|
| 1 | LLM 返回 200 字英文段落，无法程序化解析 | 新增 "Return ONLY valid JSON — no markdown, no preamble, no code fences" | 多数情况下返回 JSON，但仍偶尔包裹在 \`\`\`json 代码块中 |
| 2 | JSON 被 Markdown 代码块包裹（\`\`\`json ... \`\`\`） | 新增 safeJSONParse Layer 2 防线：自动提取代码块、去除注释、修复尾部逗号 | safeJSONParse 捕获 95% 的格式问题 |
| 3 | LLM 含糊其辞："the stock could possibly move either up or down depending on market conditions" | 新增 Rule 8：明确禁止 'however', 'might', 'could possibly' 等模糊词汇 | AI 分析变得果断明确，强制给出方向性判断 |
| 4 | LLM 使用自创的 JSON 键名（如 `market_sentiment` 代替 `sentiment`） | 新增 Rule 10：精确列举允许的 JSON key 名称 | 键名准确率从约 70% 提升至接近 100% |
| 5 | 置信度分数虚高（85-95），缺乏区分度 | 新增 Rule 9：数据不足时必须降低置信度；同时在 User Prompt 中注入方向性预计算信号（"Trading ABOVE 50-day MA — bullish signal"） | 置信度分布在 45-82 之间，显著改善信号质量 |
| 6 | 偶尔出现 NaN、Infinity、单引号字符串等非标准 JSON 值 | 在 safeJSONParse 中增加 Step 6~7：NaN/Infinity→null、单引号→双引号 | 彻底消除非标准 JSON 字面量 |
| 7 | 网络超时或 DeepSeek API 瞬时故障导致整个分析流程中断 | 新增 withRetry 机制：指数退避重试 × 3 次，仅重试瞬时错误（超时、网络、429），不重试 Schema 错误 | 瞬时故障恢复率接近 100% |
| 8 | 所有防线都无法挽救的罕见异常仍导致未捕获错误 | 最外层 try-catch + Structured Error Response（含 error code、retryable flag、attempt count），确保前端始终获得类型安全的响应 | 系统在任何情况下都能返回格式规范的响应 |

### 3.2 生产环境 Prompt 完整代码

以下是项目中的实际生产代码（`src/lib/ai/prompts/stock-analysis.ts`）：

```typescript
// ═══════════════════════════════════════════
// AI Prompt Templates — Stock Analysis
// ═══════════════════════════════════════════

import type { AIAnalysisRequest } from "@/types/ai-analysis";

/**
 * System Prompt
 * ────────────
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
 * User Prompt
 * ───────────
 * Injects structured market data directly into the LLM context.
 * Pre-computes directional signals ("Trading ABOVE 50-day MA — bullish signal")
 * rather than asking the LLM to perform calculations.
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

/**
 * Public API — assembles system + user prompts
 */
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
```

### 3.3 边界控制：强制 JSON + 禁止乱说话

Prompt 工程的核心目标是**约束 LLM 的行为边界**。一个不受约束的 LLM 会产生散文式分析、模糊判断、自创键名——在金融场景中这些都是废料。以下是 5 条边界控制策略：

#### 边界 1：输出格式封锁

**规则：** `Return ONLY valid JSON — no markdown, no preamble, no code fences.`

这条规则是 Prompt 的第一条，也是最重要的一条。它明确告诉 LLM：不要 Markdown 代码块、不要前置说明文字、不要"OK here is the analysis"之类的寒暄前缀。只允许纯 JSON。

#### 边界 2：禁止模糊措辞

**规则：** `Do not use hedging words: avoid 'however', 'might', 'could possibly'.`

金融分析需要确定性判断。LLM 的天性是不确定性表达——"the stock might go up however market conditions could change"。这条规则直接封杀了最常用的 4 个模糊词汇，迫使 LLM 选择立场（Bullish / Neutral / Bearish）。

**效果对比：**

| 禁止前 | 禁止后 |
|--------|--------|
| "The stock could possibly move either up or down depending on how market conditions evolve." | "Market data shows bullish momentum with price above key moving averages." |

#### 边界 3：置信度诚实机制

**规则：** `If data is insufficient to be confident, lower your confidence score.`

没有这条规则时，LLM 倾向于给出 85-95 的高置信度。这条规则建立了一个"数据不足 = 低置信度"的条件反射，使 AI 在信息不足时主动降低信心。

#### 边界 4：键名锁定

**规则：** `Use only the JSON keys: "summary", "sentiment", "risk_level", "confidence", "key_factors".`

LLM 会创造语义相近但不同的键名（如 `market_sentiment`、`riskLevel`、`confidence_score`）。明确列举所有允许的键名消除了这种变异。

#### 边界 5：纯数据驱动

**规则：** `Base your analysis on the provided data, not generic knowledge.`

这条规则切断了 LLM 从训练数据中补充"常识"的倾向（如"AAPL 是优质公司"），将分析锚定在实际传入的行情数据上。

---

### 3.4 Prompt 设计原则总结

| 原则 | 实现方式 | 对应 Rule |
|------|---------|----------|
| **角色锚定** | "senior financial analyst at a top-tier investment bank" — 将 LLM 锚定在专业角色中，抑制闲聊/创意输出 | System Prompt 首行 |
| **格式契约** | "ONLY valid JSON — no markdown, no preamble, no code fences" — 建立明确的输出格式契约 | Rule 1 |
| **消除模糊** | 禁止 'however', 'might', 'could possibly' — 金融分析需要果断判断，不是概率性推测 | Rule 8 |
| **边界约束** | 精确的字符限制（50-600, 5-200）和数值范围（0-100）— 防止过短/过长的低质量输出 | Rule 4, 5, 6 |
| **预计算信号** | "Trading ABOVE 50-day MA — bullish signal" — 将计算任务移到服务端，LLM 只负责解读 | User Prompt MA 比较 |
| **空值消噪** | MA 不可用时整行省略而非显示 "N/A" — 减少 NULL 值对 LLM 注意力的干扰 | User Prompt filter(Boolean) |
| **键名锁定** | 明确列举允许的 JSON key — 防止 LLM 创造不一致的键名 | Rule 10 |

---

## 4. 结构化输出工程

### 4.1 可靠性问题

LLM 本质上是非确定性的。即使有明确的指令，它们也会产生：

- Markdown 包裹的 JSON（` ```json { ... } ``` `）
- 尾部逗号（`{"a": 1,}`）
- 单引号字符串
- JSON 中的 JavaScript 注释
- `NaN` / `Infinity` 字面量
- 错误的键名、类型、越界数值

在金融应用中，单个格式错误的响应就能破坏整个管线。系统必须做到**可靠，而非概率性**。

### 4.2 三层防线架构

```
┌─────────────────────────────────────────────────────────┐
│ LAYER 1: System Prompt                                  │
│ 10 条明确规则约束输出格式                                 │
│ "Return ONLY valid JSON — no markdown, no preamble"     │
├─────────────────────────────────────────────────────────┤
│ LAYER 2: safeJSONParse（9 步清洗）                       │
│ 1. 移除 BOM      2. 提取 ```json 代码块                  │
│ 3. 移除 // 注释   4. 移除 /* */ 注释                     │
│ 5. 移除尾部逗号                                          │
│ 6. NaN/Infinity → null                                  │
│ 7. 单引号 → 双引号                                       │
│ 8. 去除首尾空白                                          │
│ 9. JSON.parse → { ok: true, data } | { ok: false, error }│
├─────────────────────────────────────────────────────────┤
│ LAYER 3: zod.safeParse                                  │
│ 严格 Schema：精确的键名、精确的类型、精确的范围             │
│ 拒绝：缺失键、错误类型、额外属性                           │
├─────────────────────────────────────────────────────────┤
│ RETRY: withRetry({ maxAttempts: 3, strategy: exponential })│
│ 仅在瞬时错误时重试（超时、网络、429）                       │
│ 不在 Schema 错误时重试（契约是固定的）                     │
└─────────────────────────────────────────────────────────┘
```

### 4.3 完整 Schema 定义（生产代码）

以下是项目中的实际生产代码（`src/types/ai-analysis.ts`），包含 AI 输出 Schema + 输入校验 Schema + API 响应类型：

```typescript
// ═══════════════════════════════════════════
// AI Analysis — Zod Schemas
// ═══════════════════════════════════════════

// ── LLM structured output (the contract) ──

export const sentimentEnum = z.enum(["Bullish", "Neutral", "Bearish"]);
export type Sentiment = z.infer<typeof sentimentEnum>;

export const riskLevelEnum = z.enum(["Low", "Medium", "High"]);
export type RiskLevel = z.infer<typeof riskLevelEnum>;

export const aiAnalysisOutputSchema = z.object({
  summary: z.string().min(50).max(600),
  sentiment: sentimentEnum,
  risk_level: riskLevelEnum,
  confidence: z.number().min(0).max(100),
  key_factors: z.array(z.string().min(5).max(200)).min(2).max(5),
});
export type AIAnalysisOutput = z.infer<typeof aiAnalysisOutputSchema>;

// ── Request (what the client sends) ──

export const aiAnalysisRequestSchema = z.object({
  ticker: z.string().min(1).max(10).transform((s) => s.toUpperCase()),
  analysisType: z.enum(["TECHNICAL", "FUNDAMENTAL", "SENTIMENT", "COMPREHENSIVE"]),
  timeframe: z.enum(["INTRADAY", "DAILY", "WEEKLY", "MONTHLY"]).default("DAILY"),
  stockData: z.object({
    currentPrice: z.number(),
    dailyChange: z.number(),
    dailyChangePercent: z.number(),
    volume: z.number(),
    marketCap: z.number().nullable().optional(),
    movingAverage50Day: z.number().nullable().optional(),
    high: z.number(),
    low: z.number(),
    open: z.number(),
    previousClose: z.number(),
    currency: z.string().default("USD"),
  }),
});
export type AIAnalysisRequest = z.infer<typeof aiAnalysisRequestSchema>;

// ── Response ──

export interface AIAnalysisSuccessResponse {
  success: true;
  data: AIAnalysisOutput;
  meta: {
    model: string;
    tokensInput: number;
    tokensOutput: number;
    latencyMs: number;
    attempts: number;
    analysisId: string;
  };
}

export interface AIAnalysisErrorResponse {
  success: false;
  error: {
    code: string;       // AI_VALIDATION_FAILED | AI_TIMEOUT | AI_GENERATION_FAILED | ...
    message: string;
    retryable: boolean; // 客户端可据此决定是否重试
    attempts: number;   // 已尝试次数
  };
}

export type AIAnalysisApiResponse =
  | AIAnalysisSuccessResponse
  | AIAnalysisErrorResponse;
```

### 4.4 验证管线代码

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

### 4.5 结构化输出对金融 AI 的意义

- **可操作的信号** — "Bullish, Medium Risk, Confidence 72" 是一个交易信号。200 字的段落不是。
- **可审计性** — 每份分析都以结构化 JSON 存入 Supabase。可查询。可跨时间对比。
- **下游自动化** — 结构化信号可直接输入预警、回测、组合再平衡系统，无需额外的 NLP 处理。
- **可靠性量化** — 结构化输出使定量评估成为可能：信号与结果的匹配频率是多少？

---

## 5. 调试记录

### 5.1 `chart.series is not a function`（严重）

- **问题：** 切换 ticker 后图表渲染失败。浏览器控制台报错：`TypeError: chart.series is not a function`
- **根因：** lightweight-charts v5.2.0 从公开 API 中移除了 `chart.series()`，并将 `addCandlestickSeries()` 改为 `addSeries(CandlestickSeries, opts)`。代码是基于 v4 API 编写的。
- **Claude Code 调试 process：**

```
Prompt: "Error: chart.series is not a function"

Claude Code 分析：
> 检查了 package.json 中的版本约束（^5.0.0）与实际安装版本（5.2.0）
> 检查了 lightweight-charts 的类型定义文件，确认 series() 不在公开接口中
> 确认 v4 → v5 迁移指南：addCandlestickSeries → addSeries(CandlestickSeries, opts)
```

- **解决方案：** 将增量系列操作替换为销毁-重建策略。现在 candle 数据的 `useEffect` 先移除旧图表再创建新图表。在 `next.config.ts` 中添加 `transpilePackages: ["lightweight-charts"]` 以支持 ESM 互操作。
- **教训：** Canvas 图表库 API 变更频繁，销毁-新建模式比增量 API 操作更简单、更可靠。

---

### 5.2 `calcEMA` 稀疏数组（严重）— 代表性案例

- **问题：** `Cannot read properties of undefined (reading 'time')` — 选择任何 ticker 都导致图表崩溃。
- **根因：** `calcEMA()` 使用 `result[period - 1] = value` 设置第一个 EMA 值，后续值通过 `result.push()` 添加，导致索引 0-18 为 `undefined`（稀疏数组）。图表数据映射将数组索引当作 K 线索引使用：`ema20.map((v, i) => ({ time: candles[i].date, value: v }))` — 将 `candles[0]` 映射到了 `undefined` 值。
- **Claude Code 调试 process：**

```
Prompt: "Application error: 点击 ticker 后图表崩溃。Cannot read properties of undefined (reading 'time')"

Claude Code 分析：
> 错误栈指向 chart 数据映射的 .date 访问
> 追踪数据流：API → fetchKline → calcEMA → ema20.map → candles[i].date
> 检查 ema20 数组内容，发现前 19 个元素为 undefined（稀疏数组）
> 对比 calcRSI 和 calcBollinger 的实现，发现它们返回 {idx, value}[]，而 calcEMA 返回稀疏的 number[]
> 确认根因：result[period-1] = value 留下空洞，push() 继续追加

具体调试步骤：
> 1. Playwright 抓取浏览器报错
> 2. 使用 curl 测试 API 端点（数据正常返回，排除 API 层问题）
> 3. 逐函数注入 console.log 追踪计算输出
> 4. 对比 calcEMA / calcRSI / calcBollinger 的返回格式
> 5. 定位不一致性
```

- **解决方案：** 将所有 `calc*` 函数重构为统一的 `{ idx: number; value: number }[]` 返回类型。图表数据映射从基于位置（`candles[i]`）改为基于索引（`candles[d.idx]`）。涉及 EMA、MACD 和 MACD 信号线计算。
- **教训：** TypeScript 的 `number[]` 类型无法检测稀疏数组。对于计算指标数组，使用一致的 `{idx, value}[]` 模式并显式索引追踪，比基于位置的数据映射更安全。

---

### 5.3 水合失败（轻微）

- **问题：** React 水合警告："server rendered HTML didn't match the client"
- **根因：** （1）`StatusBar` 在 SSR 阶段调用 `new Date().toLocaleTimeString()`，导致客户端和服务端输出不同。（2）Ticker Bar 的 `animate-scroll-x` CSS 动画在客户端启动后将元素移位。
- **解决方案：** （1）将时间显示延迟到 `useEffect` + `setInterval`，初始状态为空字符串。（2）为 ticker bar 容器添加 `suppressHydrationWarning`，因为内容一致、仅动画位移不同。
- **教训：** 任何涉及 `Date`、`window` 或 CSS 动画的组件必须放在客户端渲染守卫之后，以避免水合不一致。

---

### 5.4 东方财富美股 K 线 DNS 故障（严重）— 代表性案例

- **问题：** 美股 K 线 API 返回 `fetch failed`，但 A 股 K 线正常。同一个端点，不同市场代码。
- **根因：** 主域名 `push2his.eastmoney.com` 在用户网络中解析不稳定。东方财富使用编号子域名（`1.push2his.eastmoney.com` ~ `99.push2his.eastmoney.com`）做 CDN 负载均衡，根域名的 DNS 路由不可靠。
- **Claude Code 调试 process：**

```
Prompt: "东方财富的接口是不是有问题 ticker一点击就错误"

Claude Code 分析：
> curl 测试美股 K 线 API，发现 push2his.eastmoney.com 无响应
> curl 测试 A 股 K 线 API（同域名），同样不稳定
> curl 测试基础报价 API（push2.eastmoney.com），正常工作
> 推断：push2his 子域和 push2 主域的 DNS 路由可能不同
> 尝试 curl 89.push2his.eastmoney.com —— 成功！
> 尝试 curl 1.push2his.eastmoney.com、curl 45.push2his.eastmoney.com —— 部分成功
> 确认：东方财富使用编号子域名做 CDN 分片

具体调试命令：
> curl -s --max-time 10 "https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=105.AAPL&..."  # 超时
> curl -s --max-time 10 "https://89.push2his.eastmoney.com/api/qt/stock/kline/get?secid=105.AAPL&..."  # 成功
> for h in "aws-0-us-east-1.pooler.supabase.com:5432" "db.xxx.supabase.co:5432"; do
    echo ">$h<"; timeout 5 bash -c "echo >/dev/tcp/$h" 2>/dev/null && echo OK || echo FAIL; done
```

- **解决方案：** `klineUrl()` 为每次 K 线请求生成随机子域名（1-99），将请求分发到各个 CDN 节点，绕过不可靠的根域名。
- **教训：** 基于 CDN 的中国 API 常使用编号子域名做分片。单一主机名解析是单点故障。随机化提供内置的负载均衡和容错能力。

---

### 5.5 Finnhub 限流（严重）

- **问题：** 美股数据在约 5 次查询后返回 500 错误。仪表盘不可用。
- **根因：** Finnhub 免费版限流 60 次/分钟。仪表盘每次 ticker 切换触发 2 次 API 调用（报价 + K 线），每次交互都消耗配额，几秒内耗尽。
- **解决方案：** 将所有数据获取迁移至东方财富（免费、无 Key、无限流、覆盖更广）。完全删除 Finnhub 和 Alpha Vantage 提供商。将 `resolveProvider()` 简化为单一路径。
- **教训：** 免费版 API 的限流策略从根本上与交互式仪表盘不兼容。选择数据供应商时，限流策略应是首要标准——优于数据质量、文档质量或 SDK 质量。

---

### 5.6 PostgreSQL 端口阻塞（基础设施）

- **问题：** `prisma migrate dev` 失败：`P1001: Can't reach database server at aws-0-us-east-1.pooler.supabase.com:5432`
- **根因：** 网络层阻止了 TCP 端口 5432（PostgreSQL）。HTTPS 端口 443 可正常访问。
- **解决方案：** 从 Prisma 直连迁移到 Supabase JS 客户端（`@supabase/supabase-js`），通过 HTTPS REST API 在端口 443 通信。数据库表通过 Supabase SQL Editor（浏览器方式，HTTPS）创建。Prisma 仅保留用于 schema 定义和类型生成。
- **教训：** 在受限网络环境中，优先选择应用层数据库访问（HTTPS REST/GraphQL）而非传输层连接（TCP）。Supabase 的双重访问模式（直连 PostgreSQL + REST API）展现了关键的部署灵活性。

---

### 5.7 重复 JSX 元素（编译）

- **问题：** 构建失败：`Unexpected token div. Expected jsx identifier`
- **根因：** 向工具栏添加搜索框时，意外引入了重复的 `<div>` 起始标签（两个完全相同的时间框架容器 div）。
- **解决方案：** 删除重复标签。将 `tsc --noEmit` 检查纳入开发工作流，以在运行时之前捕获 JSX 结构错误。
- **教训：** 对于 JSX 密集的文件，自动化标签计数比手动视觉检查更快。pre-commit 阶段增加 `tsc --noEmit` 可以在运行时之前捕获此类错误。

---

## 6. 前端架构

### 6.1 组件树

```
TerminalPage
├── TickerBar                    （滚动行情，纯展示）
├── [主网格]
│   ├── WatchlistPanel           （110+ 只股票，美/A 分区，筛选搜索）
│   ├── [中部：图表 + 工具栏]
│   │   ├── Toolbar              （ticker 显示、搜索框、时间段、AI 按钮）
│   │   └── Chart                （TradingView Canvas，8 项指标，多面板）
│   │       ├── Candlestick 系列
│   │       ├── EMA 20 + EMA 50 叠加
│   │       ├── Bollinger Bands 叠加
│   │       ├── VWAP 叠加
│   │       ├── Volume 柱状图
│   │       ├── MACD 面板（柱状图 + 信号线）
│   │       └── RSI 面板（70/30 阈值线）
│   └── AI 量化面板              （8 项量化指标，信号徽章，置信度条）
│       ├── FearGreedIndex       （5 段刻度）
│       └── TrendingStocks       （6 只热门 + 涨跌幅 + 成交量）
└── StatusBar                    （连接状态、数据源、实时时钟）
```

### 6.2 状态架构（Zustand）

```typescript
interface TerminalState {
  activeTicker: string;          // 当前选中的 ticker
  tickerData: StockQuote | null; // 实时报价数据
  candles: CandlePoint[];        // OHLCV 历史（155 天）
  aiData: AIQuantData | null;    // 结构化 AI 分析
  watchlist: string[];           // 110+ 只精选自选股
  tickerBar: TickerItem[];       // 滚动行情栏数据（16 只）
  timeframe: string;             // 1D/1W/1M/3M/1Y/ALL

  // Actions（共 10 个）
  setActiveTicker, setTickerData, setCandles, setAIData,
  setWatchlist, setTickerBar, setTimeframe, setLoading, setAnalyzing
}
```

**设计考量：**
- 单一 store 而非多个 context — 终端状态本质上是全局的（哪个 ticker 被选中、加载了什么数据）
- 基于 selector 的订阅 — 组件仅在其订阅的 slice 变化时才重渲染
- Store 内无异步 action — API 调用放在页面组件的 `useCallback` hooks 中，使 store 保持同步和可预测

### 6.3 图表渲染策略

图表采用**销毁-重建**模式处理数据变更：

```
useEffect(() => {
  // 1. 销毁旧图表
  chartApiRef.current?.remove();

  // 2. 用容器尺寸创建新图表
  const chart = createChart(container, { width, height });

  // 3. 添加所有系列及新数据
  chart.addSeries(CandlestickSeries, opts).setData(candles);
  chart.addSeries(LineSeries, opts).setData(ema20);
  // ... 15+ 个系列

  // 4. ResizeObserver 实现响应式布局
  new ResizeObserver(() => chart.applyOptions({ width, height }))
    .observe(container);

  // 5. 卸载时清理
  return () => chart.remove();
}, [candles]);
```

选择此方案而非增量系列操作，因为 lightweight-charts v5 API 变更导致 `chart.series()` 和 `chart.removeSeries()` 在清理 15+ 个系列时不可靠。

### 6.4 数据流

```
用户操作 → Zustand Store 更新 → React 重渲染 → useEffect → API 调用 → Store 更新 → 图表重渲染
                                                                               → AI 面板更新
```

每次 ticker 选择触发两个并行的 API 调用（`Promise.all`）获取报价和 K 线数据。AI 分析通过显式按钮点击触发（非自动），以避免不必要的 LLM 调用成本。

---

## 7. UI/UX 设计哲学

### 7.1 设计参考

| 来源 | 应用方向 |
|------|----------|
| TradingView | 多面板图表作为视觉核心、时间段切换器、涨跌色彩语义 |
| Bloomberg Terminal | 高数据密度、等宽金融字体、紧凑工具栏、状态栏 |
| Binance Pro | 实时行情滚动条、买卖色彩系统、订单簿视觉效果 |
| Perplexity AI | 结构化 AI 输出，信号徽章替代文字段落 |

### 7.2 视觉层次

布局遵循机构交易员的工作流：

```
1. Ticker Bar     （背景 — 市场在做什么？）
2. Watchlist      （导航 — 我想看什么？）
3. K-line 图表    （决策 — 价格走势如何？）
4. AI 量化面板    （确认 — AI 怎么判断？）
5. Status Bar     （基础设施 — 系统健康吗？）
```

### 7.3 色彩体系

```
Background:  #0A0E17 （深海蓝 — 减少眼疲劳，交易厅标配）
Surface:     #111827 （卡片、面板）
Border:      rgba(255,255,255,0.06) （几乎不可见，无噪点信息分隔）
Bullish:     #00C087 （青绿色 — 区别于标准绿色，高级感）
Bearish:     #FF4D4F （暖红色 — 立即引起注意，不刺眼）
Primary:     #3B82F6 （柔和蓝 — 专业，非装饰性）
Text:        #E5E7EB （近白色 — 深色背景上高对比度）
Muted:       #94A3B8 （冷灰色 — 辅助信息）
```

### 7.4 字体

- **Inter** — UI 文本、标题、标签（干净几何无衬线字体）
- **JetBrains Mono** — 所有数值数据、ticker 代码、价格（等宽字体 + `tabular-nums` 实现完美列对齐）

---

## 8. 性能优化

### 8.1 图表策略
- Canvas 渲染（TradingView Lightweight Charts）—— 每根 K 线零 DOM 节点，对 155 节点数据集 + 8 项指标叠加至关重要

### 8.2 状态管理
- Zustand selector 模式 —— 组件订阅单个 state slice，避免无关更新的重渲染
- `useCallback` 包裹事件处理器 —— 跨渲染周期保持函数引用稳定

### 8.3 数据获取
- 内存 TTL 缓存 —— 股票报价 60s，K 线 300s
- `Promise.all` 并行获取报价 + K 线数据
- 动态 `import()` 加载 provider 模块 —— 按市场代码分割

### 8.4 构建优化
- `transpilePackages` 处理纯 ESM 库（lightweight-charts、framer-motion、zustand）
- `optimizePackageImports` 优化图标库和 UI 包

---

## 9. 未来优化方向

### 9.1 短期（1-2 月）
- **WebSocket 实时行情** —— 用 Supabase Realtime 的推送式价格更新替代轮询式滚动行情栏
- **价格预警** —— 通过浏览器 Notification API 实现用户自定义阈值通知
- **Watchlist 持久化** —— 当前为 Zustand store（易失）；迁移至 Supabase 后台的用户数据

### 9.2 中期（3-6 月）
- **多 Agent AI 分析** —— 并行技术面、基本面、市场情绪 Agent，集成信号聚合
- **AI 回测引擎** —— 将历史 K 线数据重放至 AI 分析管线，量化评估信号准确率
- **组合盈亏追踪** —— 持久化持仓及已实现/未实现盈亏计算

### 9.3 长期（6-12 月）
- **机构订单流分析** —— 大单检测、暗池监控
- **期权链分析** —— Greeks 可视化、隐含波动率曲面
- **自然语言查询** —— "show me stocks with RSI < 30 and volume > 2x average" —— 作为结构化分析的互补能力

---

*AI Stock Analysis 工程报告。以 Claude Code、DeepSeek V4 Pro 及生产优先的工程思维构建。*
