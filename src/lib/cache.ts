import { CACHE_KEY, CACHE_TTL_MS } from './types'
import type { CachedAppData } from './types'

export function saveToCache(data: CachedAppData): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch {
    // localStorage unavailable or quota exceeded — skip silently
  }
}

export function loadFromCache(): CachedAppData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CachedAppData
  } catch {
    return null
  }
}

export function isCacheValid(data: CachedAppData): boolean {
  return Date.now() - data.cachedAt < CACHE_TTL_MS
}
