// Utility for localStorage cache with Stale-While-Revalidate pattern

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttlMs?: number;
}

export function setCached<T>(key: string, data: T, ttlMs?: number): void {
  try {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttlMs,
    };
    localStorage.setItem(key, JSON.stringify(item));
  } catch (e) {
    console.error('Failed to write to localStorage cache:', e);
  }
}

export function getCached<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    
    const item = JSON.parse(raw) as CacheItem<T>;
    if (!item || typeof item.timestamp !== 'number') return null;
    
    // Check if expired
    if (item.ttlMs && Date.now() - item.timestamp > item.ttlMs) {
      return null;
    }
    
    return item.data;
  } catch (e) {
    console.error('Failed to read from localStorage cache:', e);
    return null;
  }
}

/**
 * Returns the cached data regardless of whether it is expired or not.
 * Useful for displaying cached data instantly (Stale) while fetching fresh data in background.
 */
export function getCachedStale<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    
    const item = JSON.parse(raw) as CacheItem<T>;
    if (!item) return null;
    
    return item.data;
  } catch (e) {
    console.error('Failed to read stale cache from localStorage:', e);
    return null;
  }
}

export function isCacheExpired(key: string): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return true;
    
    const item = JSON.parse(raw) as CacheItem<any>;
    if (!item || typeof item.timestamp !== 'number') return true;
    
    if (item.ttlMs && Date.now() - item.timestamp > item.ttlMs) {
      return true;
    }
    
    return false;
  } catch (e) {
    return true;
  }
}

export function invalidateCache(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error('Failed to invalidate cache key:', e);
  }
}
