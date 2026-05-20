import { z } from "zod";

/* ═══════════════════════════════════════════
   Shared TypeScript Types & Zod Schemas
   ═══════════════════════════════════════════ */

/* ── Pagination ── */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type Pagination = z.infer<typeof paginationSchema>;

/* ── Sort ── */
export const sortSchema = z.object({
  field: z.string(),
  direction: z.enum(["asc", "desc"]).default("desc"),
});
export type Sort = z.infer<typeof sortSchema>;

/* ── Date range ── */
export const dateRangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
export type DateRange = z.infer<typeof dateRangeSchema>;

/* ── API Response ── */
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

/* ── Stock ticker ── */
export const tickerSchema = z
  .string()
  .min(1)
  .max(10)
  .transform((s) => s.toUpperCase());
export type Ticker = z.infer<typeof tickerSchema>;

/* ── Async state ── */
export type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: string };

/* ── Stock types (re-export) ── */
export type {
  StockQuote,
  StockQuoteResponse,
  StockErrorResponse,
  StockApiResponse,
} from "./stock";
export { tickerParamSchema } from "./stock";

/* ── AI Analysis types (re-export) ── */
export type {
  AIAnalysisOutput,
  AIAnalysisRequest,
  AIAnalysisSuccessResponse,
  AIAnalysisErrorResponse,
  AIAnalysisApiResponse,
} from "./ai-analysis";
export {
  aiAnalysisOutputSchema,
  aiAnalysisRequestSchema,
} from "./ai-analysis";
