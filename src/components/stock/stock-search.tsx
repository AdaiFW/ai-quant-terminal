"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { tickerParamSchema } from "@/types/stock";
import { useDebounce } from "@/hooks";

interface StockSearchProps {
  onSelect: (ticker: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

const PLACEHOLDER_TICKERS = [
  "AAPL", "TSLA", "NVDA",    // US stocks
  "600519", "000001",         // CN stocks: 贵州茅台, 平安银行
];

export function StockSearch({
  onSelect,
  isLoading,
  disabled = false,
}: StockSearchProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedValue = useDebounce(value, 200);

  useEffect(() => {
    if (!debouncedValue) {
      setError(null);
      return;
    }
    const result = tickerParamSchema.safeParse(debouncedValue);
    setError(result.success ? null : "Invalid ticker format");
  }, [debouncedValue]);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim().toUpperCase();
    if (!trimmed) return;
    const result = tickerParamSchema.safeParse(trimmed);
    if (!result.success) {
      setError("Enter a valid ticker (e.g., AAPL)");
      return;
    }
    setError(null);
    onSelect(result.data);
  }, [value, onSelect]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleSubmit();
      if (e.key === "Escape") {
        setValue("");
        inputRef.current?.blur();
      }
    },
    [handleSubmit],
  );

  const handleClear = useCallback(() => {
    setValue("");
    setError(null);
    inputRef.current?.focus();
  }, []);

  const isValid = value.trim().length > 0 && !error;

  return (
    <div className="w-full max-w-lg">
      <div
        className={cn(
          "relative flex items-center rounded-xl border bg-background transition-all duration-200",
          focused && "border-primary/50 ring-2 ring-primary/10",
          error && "border-destructive/50 ring-2 ring-destructive/10",
          !focused && !error && "border-border hover:border-muted-foreground/30",
        )}
      >
        {/* Search icon */}
        <Search
          className={cn(
            "ml-3 h-4 w-4 shrink-0 transition-colors",
            focused ? "text-primary" : "text-muted-foreground",
          )}
        />

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value.toUpperCase())}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="Search ticker (e.g., AAPL)..."
          disabled={disabled}
          className="flex-1 bg-transparent px-3 py-3 text-sm outline-none placeholder:text-muted-foreground/60 disabled:cursor-not-allowed disabled:opacity-50"
          autoComplete="off"
          spellCheck={false}
        />

        {/* Clear button */}
        {value && (
          <button
            onClick={handleClear}
            className="mr-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!isValid || isLoading || disabled}
          className={cn(
            "mr-2 flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all duration-200",
            isValid && !isLoading
              ? "bg-primary text-primary-foreground hover:opacity-90 active:scale-95"
              : "cursor-not-allowed bg-muted text-muted-foreground",
          )}
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            "Search"
          )}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-1.5 animate-fade-in pl-1 text-xs text-destructive">
          {error}
        </p>
      )}

      {/* Quick suggestions */}
      {focused && !value && (
        <div className="mt-2 flex animate-fade-in flex-wrap gap-1.5">
          {PLACEHOLDER_TICKERS.map((t) => (
            <button
              key={t}
              onClick={() => {
                setValue(t);
                onSelect(t);
              }}
              className="rounded-md border bg-background px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
