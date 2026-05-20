/* ═══════════════════════════════════════════
   Safe JSON Parser — LLM Output Sanitisation
   ───────────────────────────────────────────
   LLMs frequently produce "almost valid" JSON:
   - Wrapped in ```json fences
   - Trailing commas before } or ]
   - Single quotes instead of double quotes
   - C-style comments: // single-line and slash-star block (non-standard)
   - Leading/trailing whitespace or BOM
   - Unescaped control characters in strings
   - NaN / Infinity literals (not valid JSON)

   This parser normalises before JSON.parse.
   ═══════════════════════════════════════════ */

export interface ParseResult<T> {
  ok: true;
  data: T;
  warnings: string[];
}

export interface ParseError {
  ok: false;
  error: string;
  raw: string;
}

export type SafeParseOutcome<T> = ParseResult<T> | ParseError;

/**
 * Parse an LLM text response into a typed object.
 * Applies a sequence of sanitisation steps before JSON.parse.
 */
export function safeJSONParse<T = unknown>(
  raw: string,
): SafeParseOutcome<T> {
  const warnings: string[] = [];
  let sanitised = raw;

  // 1. Strip BOM
  sanitised = sanitised.replace(/^﻿/, "");

  // 2. Extract from markdown code fences
  const fenceMatch = sanitised.match(
    /```(?:json)?\s*([\s\S]*?)```/,
  );
  if (fenceMatch) {
    sanitised = fenceMatch[1]!.trim();
    warnings.push("extracted_from_code_fence");
  }

  // 3. Strip single-line comments (//). Avoid matching URLs (://).
  sanitised = sanitised.replace(
    /(?<!:)\/\/.*$/gm,
    "",
  );

  // 4. Strip multi-line comments (/* */)
  sanitised = sanitised.replace(
    /\/\*[\s\S]*?\*\//g,
    "",
  );

  // 5. Strip trailing commas before } or ]
  sanitised = sanitised.replace(/,(\s*[}\]])/g, "$1");

  // 6. Replace NaN / Infinity with null (valid JSON alternative)
  if (/\bNaN\b/.test(sanitised)) {
    sanitised = sanitised.replace(/\bNaN\b/g, "null");
    warnings.push("nan_replaced_with_null");
  }
  if (/\bInfinity\b/.test(sanitised)) {
    sanitised = sanitised.replace(/\b-?Infinity\b/g, "null");
    warnings.push("infinity_replaced_with_null");
  }

  // 7. Fix single quotes as key/value delimiters (best-effort)
  //    Only attempt if double-quote count looks wrong
  const doubleQuoteCount = (sanitised.match(/"/g) ?? []).length;
  if (doubleQuoteCount === 0) {
    sanitised = sanitised.replace(/'/g, '"');
    warnings.push("single_quotes_converted");
  }

  // 8. Trim
  sanitised = sanitised.trim();

  // 9. Parse
  try {
    const data = JSON.parse(sanitised) as T;
    return { ok: true, data, warnings };
  } catch (err) {
    const message =
      err instanceof SyntaxError ? err.message : String(err);
    return {
      ok: false,
      error: `JSON parse failed: ${message}`,
      raw: sanitised.slice(0, 500),
    };
  }
}

/**
 * Like safeJSONParse but throws on failure (for use in retry loops).
 */
export function safeJSONParseOrThrow<T = unknown>(raw: string): {
  data: T;
  warnings: string[];
} {
  const result = safeJSONParse<T>(raw);
  if (!result.ok) {
    throw new Error(result.error);
  }
  return { data: result.data, warnings: result.warnings };
}
