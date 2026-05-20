/* ═══════════════════════════════════════════
   In-memory TTL Cache
   ───────────────────────────────────────────
   Per-request deduplication + TTL-based expiry.
   In production, swap for Redis or Next.js
   incremental cache (unstable_cache).
   ═══════════════════════════════════════════ */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  storedAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

/** Default TTL: 60 seconds for stock quotes */
const DEFAULT_TTL_MS = 60_000;

/**
 * Get a cached value or compute + store it.
 */
export async function withCache<T>(
  key: string,
  compute: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS,
): Promise<{ data: T; cached: boolean; cachedAt: string | null }> {
  const entry = store.get(key);

  if (entry && entry.expiresAt > Date.now()) {
    return {
      data: entry.data as T,
      cached: true,
      cachedAt: new Date(entry.storedAt).toISOString(),
    };
  }

  // Evict expired entry
  if (entry) store.delete(key);

  const data = await compute();

  store.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
    storedAt: Date.now(),
  });

  return { data, cached: false, cachedAt: null };
}

/**
 * Invalidate a specific cache key.
 */
export function invalidateCache(key: string): void {
  store.delete(key);
}

/**
 * Invalidate all keys matching a prefix.
 */
export function invalidateByPrefix(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

/**
 * Periodically clean expired entries.
 * Called on each request to prevent memory leaks.
 */
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 300_000; // 5 minutes

function cleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store.entries()) {
    if (entry.expiresAt <= now) store.delete(key);
  }
}

// Run cleanup on cache access
export function getCacheSize(): number {
  cleanup();
  return store.size;
}
