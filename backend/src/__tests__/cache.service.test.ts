/**
 * Cache Service Tests
 *
 * Unit tests for the in-memory LRU-TTL cache.
 */

import { CacheService } from '../services/cache.service';

// ─── Basic Get / Set ──────────────────────────────────────────────────────────

describe('CacheService — basic operations', () => {
  let cache: CacheService<string>;

  beforeEach(() => {
    cache = new CacheService<string>(60, 5); // 60s TTL, max 5 entries
  });

  it('stores and retrieves a value', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('returns undefined for missing keys', () => {
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('has() returns true for existing key', () => {
    cache.set('k', 'v');
    expect(cache.has('k')).toBe(true);
  });

  it('has() returns false for missing key', () => {
    expect(cache.has('missing')).toBe(false);
  });

  it('delete() removes an entry', () => {
    cache.set('del', 'me');
    cache.delete('del');
    expect(cache.get('del')).toBeUndefined();
  });

  it('clear() removes all entries', () => {
    cache.set('a', '1');
    cache.set('b', '2');
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it('size reflects number of stored entries', () => {
    cache.set('a', '1');
    cache.set('b', '2');
    expect(cache.size).toBe(2);
  });
});

// ─── TTL Expiry ───────────────────────────────────────────────────────────────

describe('CacheService — TTL expiry', () => {
  it('returns undefined for an expired entry', async () => {
    const cache = new CacheService<string>(0.01); // 10ms TTL
    cache.set('expiring', 'value');
    await new Promise(r => setTimeout(r, 50)); // wait 50ms
    expect(cache.get('expiring')).toBeUndefined();
  });

  it('purgeExpired() removes expired entries and returns count', async () => {
    const cache = new CacheService<string>(0.01); // 10ms TTL
    cache.set('a', '1');
    cache.set('b', '2');
    await new Promise(r => setTimeout(r, 50));
    const removed = cache.purgeExpired();
    expect(removed).toBe(2);
    expect(cache.size).toBe(0);
  });

  it('does not expire entries before TTL', async () => {
    const cache = new CacheService<string>(60); // 60s TTL
    cache.set('fresh', 'value');
    await new Promise(r => setTimeout(r, 10));
    expect(cache.get('fresh')).toBe('value');
  });
});

// ─── Max Size / Eviction ──────────────────────────────────────────────────────

describe('CacheService — max size eviction', () => {
  it('evicts the oldest entry when at capacity', () => {
    const cache = new CacheService<string>(60, 3); // max 3
    cache.set('first', '1');
    cache.set('second', '2');
    cache.set('third', '3');
    // Adding a 4th should evict 'first'
    cache.set('fourth', '4');
    expect(cache.get('first')).toBeUndefined();
    expect(cache.get('second')).toBe('2');
    expect(cache.get('fourth')).toBe('4');
  });

  it('does not evict when updating existing key', () => {
    const cache = new CacheService<string>(60, 2);
    cache.set('a', '1');
    cache.set('b', '2');
    cache.set('a', 'updated'); // update existing, not a new key
    expect(cache.size).toBe(2);
    expect(cache.get('a')).toBe('updated');
    expect(cache.get('b')).toBe('2');
  });
});

// ─── buildKey() ───────────────────────────────────────────────────────────────

describe('CacheService.buildKey()', () => {
  it('produces the same key for same params in different order', () => {
    const key1 = CacheService.buildKey({ a: '1', b: '2' });
    const key2 = CacheService.buildKey({ b: '2', a: '1' });
    expect(key1).toBe(key2);
  });

  it('normalizes string values to lowercase', () => {
    const key1 = CacheService.buildKey({ keywords: 'TypeScript' });
    const key2 = CacheService.buildKey({ keywords: 'typescript' });
    expect(key1).toBe(key2);
  });

  it('excludes undefined, null, and empty string values', () => {
    const key1 = CacheService.buildKey({ a: '1', b: undefined });
    const key2 = CacheService.buildKey({ a: '1' });
    expect(key1).toBe(key2);
  });

  it('produces different keys for different params', () => {
    const key1 = CacheService.buildKey({ keywords: 'engineer' });
    const key2 = CacheService.buildKey({ keywords: 'designer' });
    expect(key1).not.toBe(key2);
  });
});
