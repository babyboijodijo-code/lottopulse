export type Game = 'powerball' | 'megamillions'
export type Mode = 'full' | 'bonus'
export type Era = 'current' | 'legacy'

export interface Draw {
  date: string      // 'YYYY-MM-DD'
  whites: number[]  // exactly 5 numbers, sorted ascending
  bonus: number
  game: Game
  era: Era
}

export interface NumberScore {
  number: number
  freqScore: number     // 0–1, max-normalized
  recencyScore: number  // 0–1, max-normalized
  gapScore: number      // 0–1
  combined: number      // weighted average of the three signals
  appearances: number   // raw count in current-era draws
  lastSeenDrawsAgo: number
  avgGap: number
}

export interface Pick {
  whites: number[]  // 5 numbers sorted ascending
  bonus: number
  confidence: number  // 0–100
}

export interface BonusPick {
  bonus: number
  confidence: number
  score: NumberScore
}

export interface GameData {
  game: Game
  draws: Draw[]           // all eras merged
  currentEraDraws: Draw[] // current era only — used for analysis
  fetchedAt: number       // unix ms
}

export interface CachedAppData {
  powerball: GameData
  megamillions: GameData
  cachedAt: number  // unix ms
}

export interface AnalysisResult {
  whiteScores: NumberScore[]  // full pool sorted by combined desc
  bonusScores: NumberScore[]  // full bonus pool sorted by combined desc
  topPairs: Array<{ a: number; b: number; count: number }>
  pick: Pick
  bonusPick: BonusPick
}

export const GAME_CONFIG = {
  powerball: {
    currentEraStart: '2015-10-07',
    whiteMax: { current: 69, legacy: 59 },
    bonusMax: { current: 26, legacy: 35 },
    label: 'Powerball',
    bonusLabel: 'Powerball',
    bonusColor: 'bg-red-600',
    tabColor: 'bg-red-600',
  },
  megamillions: {
    currentEraStart: '2017-10-28',
    whiteMax: { current: 70, legacy: 75 },
    bonusMax: { current: 25, legacy: 15 },
    label: 'Mega Millions',
    bonusLabel: 'Mega Ball',
    bonusColor: 'bg-yellow-400',
    tabColor: 'bg-blue-600',
  },
} as const satisfies Record<Game, {
  currentEraStart: string
  whiteMax: { current: number; legacy: number }
  bonusMax: { current: number; legacy: number }
  label: string
  bonusLabel: string
  bonusColor: string
  tabColor: string
}>

export const CACHE_TTL_MS = 24 * 60 * 60 * 1000
export const CACHE_KEY = 'lottopulse_v1'
export const RECENCY_WINDOW = 104  // ~1 year of twice-weekly draws
