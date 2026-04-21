import { describe, it, expect, beforeEach } from 'vitest'
import { saveToCache, loadFromCache, isCacheValid } from './cache'
import type { CachedAppData } from './types'

const MOCK_DATA: CachedAppData = {
  powerball: { game: 'powerball', draws: [], currentEraDraws: [], fetchedAt: Date.now() },
  megamillions: { game: 'megamillions', draws: [], currentEraDraws: [], fetchedAt: Date.now() },
  cachedAt: Date.now(),
}

beforeEach(() => {
  localStorage.clear()
})

describe('saveToCache / loadFromCache', () => {
  it('round-trips data through localStorage', () => {
    saveToCache(MOCK_DATA)
    const loaded = loadFromCache()
    expect(loaded).not.toBeNull()
    expect(loaded?.powerball.game).toBe('powerball')
  })

  it('returns null when nothing is cached', () => {
    expect(loadFromCache()).toBeNull()
  })

  it('returns null when localStorage contains invalid JSON', () => {
    localStorage.setItem('lottopulse_v1', 'not-json')
    expect(loadFromCache()).toBeNull()
  })
})

describe('isCacheValid', () => {
  it('returns true when cachedAt is within 24 hours', () => {
    expect(isCacheValid({ ...MOCK_DATA, cachedAt: Date.now() - 1000 })).toBe(true)
  })

  it('returns false when cachedAt is older than 24 hours', () => {
    expect(isCacheValid({ ...MOCK_DATA, cachedAt: Date.now() - 25 * 60 * 60 * 1000 })).toBe(false)
  })
})
