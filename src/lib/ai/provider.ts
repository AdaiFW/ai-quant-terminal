/* ═══════════════════════════════════════════
   AI Provider — DeepSeek via OpenAI-compatible API
   ───────────────────────────────────────────
   DeepSeek: POST https://api.deepseek.com/v1/chat/completions
   Supports: deepseek-chat, deepseek-reasoner, etc.
   ═══════════════════════════════════════════ */

import { createOpenAI } from "@ai-sdk/openai";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";

function getApiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    throw new Error("DEEPSEEK_API_KEY is not set");
  }
  return key;
}

const deepseek = createOpenAI({
  apiKey: getApiKey(),
  baseURL: DEEPSEEK_BASE_URL,
  compatibility: "strict",
});

export const analysisModel = deepseek(
  process.env.AI_MODEL || "deepseek-chat",
  {
    // DeepSeek recommended defaults for structured output
    temperature: 0.1,
    maxTokens: 4096,
  },
);
