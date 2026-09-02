/**
 * In-memory LRU-TTL cache for scraper results.
 *
 * Avoids re-launching Puppeteer for identical search queries within the TTL window.
 * No external dependencies — uses plain Map + timestamps.
 *
 * Characteristics:
 *   - O(1) get/set
 *   - TTL-based expiry (configurable, default 5 min)
 *   - Max capacity eviction: evicts the oldest inserted entry
 *   - Thread-safe for single-threaded Node.js event loop
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class CacheService<T = unknown> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly ttlMs: number;
  private readonly maxSize: number;

  /**
   * @param ttlSeconds  Time-to-live in seconds (default: 300 = 5 minutes)
   * @param maxSize     Maximum number of cached entries (default: 200)
   */
  constructor(ttlSeconds = 300, maxSize = 200) {
    this.ttlMs = ttlSeconds * 1000;
    this.maxSize = maxSize;
  }

  /** Build a deterministic cache key from an arbitrary object */
  static buildKey(params: Record<string, unknown>): string {
    // Sort keys so {a:1,b:2} and {b:2,a:1} produce the same key
    const sorted = Object.keys(params)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        const v = params[k];
        if (v !== undefined && v !== null && v !== '') {
          acc[k] = typeof v === 'string' ? v.toLowerCase().trim() : v;
        }
        return acc;
      }, {});
    return JSON.stringify(sorted);
  }

  /** Returns cached value if present and not expired; otherwise undefined */
  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /** Stores a value with TTL. Evicts oldest entry if at capacity. */
  set(key: string, value: T): void {
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      // Evict oldest entry (first key in insertion order)
      const firstKey = this.store.keys().next().value;
      if (firstKey !== undefined) {
        this.store.delete(firstKey);
      }
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  /** Returns true if a valid (non-expired) entry exists */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /** Explicitly remove an entry */
  delete(key: string): void {
    this.store.delete(key);
  }

  /** Remove all expired entries (useful for periodic cleanup) */
  purgeExpired(): number {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        removed++;
      }
    }
    return removed;
  }

  /** Current number of entries (including potentially expired ones not yet purged) */
  get size(): number {
    return this.store.size;
  }

  /** Clear all entries */
  clear(): void {
    this.store.clear();
  }
}

// Singleton instance shared across the application (5-min TTL, 200 entry cap)
export const scraperCache = new CacheService<import('./scraper.service').JobListing[]>(
  parseInt(process.env.CACHE_TTL_SECONDS ?? '300', 10),
  parseInt(process.env.CACHE_MAX_SIZE ?? '200', 10),
);
