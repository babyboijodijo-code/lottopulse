# LottoPulse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static React web app that fetches the full Powerball and Mega Millions draw history, runs a three-signal statistical analysis on every number, and suggests the most probable pick(s) for the next draw.

**Architecture:** React + Vite SPA with no backend. Bundled historical CSVs (pre-API era) are merged with live NY Open Data API results at startup, cached in localStorage for 24 hours. All analysis runs in TypeScript in the browser.

**Tech Stack:** React 18, Vite, TypeScript, Tailwind CSS v4, Vitest, React Testing Library, Papa Parse

---

## File Map

| File | Responsibility |
|---|---|
| `src/lib/types.ts` | Shared TypeScript types and game config constants |
| `src/lib/parse.ts` | CSV + API response parsing, era tagging, merge/dedup |
| `src/lib/analysis.ts` | Three-signal scoring engine, pick generation |
| `src/lib/cache.ts` | localStorage read/write with 24-hour TTL |
| `src/data/powerball-1992-2009.csv` | Bundled historical Powerball draws |
| `src/data/megamillions-1996-2001.csv` | Bundled historical Mega Millions draws |
| `src/components/App.tsx` | Root: data fetching orchestration, top-level state |
| `src/components/Header.tsx` | App name, game tabs, data status |
| `src/components/ModeToggle.tsx` | Full Pick / Bonus Ball Only toggle |
| `src/components/SuggestedPick.tsx` | Lottery ball display for both modes |
| `src/components/AnalysisPanels.tsx` | Frequency, Hot & Cold, Patterns panels |
| `src/components/BonusBallChart.tsx` | Full bonus ball pool frequency bar chart |
| `src/components/LoadingScreen.tsx` | Loading state |
| `src/components/ErrorCard.tsx` | Error state with Retry button |
| `src/test-setup.ts` | Vitest + React Testing Library setup |

---

## Task 1: Project scaffold

**Files:**
- Create: `vite.config.ts`, `src/main.tsx`, `src/index.css`, `src/test-setup.ts`, `src/components/App.tsx`

- [ ] **Step 1: Scaffold Vite project**

```bash
cd "/Volumes/clutter HD/claude projects/lottery winner"
npm create vite@latest . -- --template react-ts
npm install
```

Expected: project files created, `npm install` completes with no errors.

- [ ] **Step 2: Install dependencies**

```bash
npm install papaparse
npm install -D tailwindcss @tailwindcss/vite @testing-library/react @testing-library/jest-dom @testing-library/user-event vitest @vitest/coverage-v8 jsdom
npm install -D @types/papaparse
```

- [ ] **Step 3: Replace vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
})
```

- [ ] **Step 4: Replace src/index.css**

```css
@import "tailwindcss";

:root {
  color-scheme: dark;
}

body {
  background-color: #0f0f1a;
  color: #ffffff;
  min-height: 100vh;
}
```

- [ ] **Step 5: Create src/test-setup.ts**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Replace src/main.tsx**

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './components/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 7: Create placeholder App.tsx so the project compiles**

```typescript
// src/components/App.tsx
export default function App() {
  return <div>LottoPulse</div>
}
```

- [ ] **Step 8: Verify the dev server starts**

```bash
npm run dev
```

Expected: server starts at http://localhost:5173, browser shows "LottoPulse". Stop with Ctrl+C.

- [ ] **Step 9: Add to .gitignore**

Append these lines to `.gitignore`:

```
.superpowers/
dist/
```

- [ ] **Step 10: Initialise git and commit**

```bash
git init
git add .
git commit -m "chore: scaffold React + Vite + Tailwind CSS v4 + Vitest"
```

---

## Task 2: Shared types and game config

**Files:**
- Create: `src/lib/types.ts`

- [ ] **Step 1: Create src/lib/types.ts**

```typescript
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output (zero errors).

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: shared types and game config constants"
```

---

## Task 3: Source and bundle historical CSV data

**Files:**
- Create: `src/data/powerball-1992-2009.csv`
- Create: `src/data/megamillions-1996-2001.csv`

- [ ] **Step 1: Create the data directory**

```bash
mkdir -p src/data
```

- [ ] **Step 2: Inspect the NY Open Data API response format**

Run these commands and record the exact field names:

```bash
curl -s "https://data.ny.gov/resource/d6yy-54nr.json?\$limit=2" | python3 -m json.tool
curl -s "https://data.ny.gov/resource/5xaw-6ayf.json?\$limit=2" | python3 -m json.tool
```

You need to determine:
1. The exact field name for the Powerball bonus number (expected: `powerball` or it may be the last value in `winning_numbers`)
2. The exact field name for the Mega Ball (expected: `mega_ball`)

**Record the actual field names — the parser in Task 4 must match them exactly.**

- [ ] **Step 3: Source Powerball historical data (1992–2009)**

Obtain pre-2010 Powerball results from a public archive (the Powerball official site, lottery result repositories on GitHub, or public data aggregators). Format the data as CSV with these exact columns:

```
draw_date,n1,n2,n3,n4,n5,bonus
1992-11-21,6,12,21,37,43,16
1992-11-25,3,8,27,36,47,15
```

Rules:
- `draw_date`: `YYYY-MM-DD`
- `n1`–`n5`: white balls in ascending order
- `bonus`: the Powerball number
- Cover all draws from 1992-11-21 through 2009-12-31

Save as `src/data/powerball-1992-2009.csv`.

- [ ] **Step 4: Source Mega Millions historical data (1996–2001)**

Same format. The game was called "The Big Game" until May 2002.

```
draw_date,n1,n2,n3,n4,n5,bonus
1996-09-06,11,16,28,49,52,7
```

Cover all draws from 1996-09-06 through 2001-12-31. Save as `src/data/megamillions-1996-2001.csv`.

- [ ] **Step 5: Commit**

```bash
git add src/data/
git commit -m "feat: bundle historical lottery CSV data (pre-API era)"
```

---

## Task 4: Parse library

**Files:**
- Create: `src/lib/parse.ts`
- Create: `src/lib/parse.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/parse.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { parseDrawDate, tagEra, parseCsvRow, parseApiRow, mergeAndDedup } from './parse'
import type { Draw } from './types'

describe('parseDrawDate', () => {
  it('normalises ISO datetime to YYYY-MM-DD', () => {
    expect(parseDrawDate('2024-01-03T00:00:00.000')).toBe('2024-01-03')
  })

  it('passes through plain date strings unchanged', () => {
    expect(parseDrawDate('2024-01-03')).toBe('2024-01-03')
  })
})

describe('tagEra', () => {
  it('tags powerball draw on or after 2015-10-07 as current', () => {
    expect(tagEra('powerball', '2015-10-07')).toBe('current')
    expect(tagEra('powerball', '2015-10-08')).toBe('current')
  })

  it('tags powerball draw before 2015-10-07 as legacy', () => {
    expect(tagEra('powerball', '2015-10-06')).toBe('legacy')
  })

  it('tags megamillions draw on or after 2017-10-28 as current', () => {
    expect(tagEra('megamillions', '2017-10-28')).toBe('current')
  })

  it('tags megamillions draw before 2017-10-28 as legacy', () => {
    expect(tagEra('megamillions', '2017-10-27')).toBe('legacy')
  })
})

describe('parseCsvRow', () => {
  it('parses a valid CSV row into a Draw', () => {
    const row = { draw_date: '2009-12-30', n1: '5', n2: '14', n3: '22', n4: '36', n5: '51', bonus: '18' }
    expect(parseCsvRow('powerball', row)).toEqual<Draw>({
      date: '2009-12-30',
      whites: [5, 14, 22, 36, 51],
      bonus: 18,
      game: 'powerball',
      era: 'legacy',
    })
  })

  it('sorts white balls ascending regardless of input order', () => {
    const row = { draw_date: '2009-01-01', n1: '51', n2: '5', n3: '36', n4: '14', n5: '22', bonus: '10' }
    expect(parseCsvRow('powerball', row).whites).toEqual([5, 14, 22, 36, 51])
  })
})

describe('parseApiRow', () => {
  it('parses powerball API row', () => {
    // Update BONUS_FIELD_NAME below to match what you found in Task 3 Step 2
    const BONUS_FIELD_NAME = 'powerball'
    const row: Record<string, string> = {
      draw_date: '2024-01-03T00:00:00.000',
      winning_numbers: '06 18 26 46 54',
      [BONUS_FIELD_NAME]: '12',
      multiplier: '2',
    }
    expect(parseApiRow('powerball', row)).toEqual<Draw>({
      date: '2024-01-03',
      whites: [6, 18, 26, 46, 54],
      bonus: 12,
      game: 'powerball',
      era: 'current',
    })
  })

  it('parses megamillions API row', () => {
    const row: Record<string, string> = {
      draw_date: '2024-01-02T00:00:00.000',
      winning_numbers: '05 14 32 41 62',
      mega_ball: '9',
      multiplier: '3',
    }
    expect(parseApiRow('megamillions', row)).toEqual<Draw>({
      date: '2024-01-02',
      whites: [5, 14, 32, 41, 62],
      bonus: 9,
      game: 'megamillions',
      era: 'current',
    })
  })
})

describe('mergeAndDedup', () => {
  it('deduplicates draws with the same date', () => {
    const shared: Draw = { date: '2010-01-01', whites: [1,2,3,4,5], bonus: 1, game: 'powerball', era: 'current' }
    const extra: Draw = { date: '2010-01-05', whites: [6,7,8,9,10], bonus: 2, game: 'powerball', era: 'current' }
    expect(mergeAndDedup([shared], [shared, extra])).toHaveLength(2)
  })

  it('sorts result by date ascending', () => {
    const a: Draw[] = [{ date: '2010-01-05', whites: [6,7,8,9,10], bonus: 2, game: 'powerball', era: 'current' }]
    const b: Draw[] = [{ date: '2010-01-01', whites: [1,2,3,4,5], bonus: 1, game: 'powerball', era: 'current' }]
    const result = mergeAndDedup(a, b)
    expect(result[0].date).toBe('2010-01-01')
    expect(result[1].date).toBe('2010-01-05')
  })
})
```

- [ ] **Step 2: Run to verify tests fail**

```bash
npx vitest run src/lib/parse.test.ts
```

Expected: FAIL — "Cannot find module './parse'"

- [ ] **Step 3: Implement src/lib/parse.ts**

```typescript
import Papa from 'papaparse'
import { GAME_CONFIG } from './types'
import type { Draw, Era, Game } from './types'

export function parseDrawDate(raw: string): string {
  return raw.slice(0, 10)
}

export function tagEra(game: Game, date: string): Era {
  return date >= GAME_CONFIG[game].currentEraStart ? 'current' : 'legacy'
}

export function parseCsvRow(game: Game, row: Record<string, string>): Draw {
  const date = parseDrawDate(row.draw_date)
  const whites = [
    parseInt(row.n1, 10),
    parseInt(row.n2, 10),
    parseInt(row.n3, 10),
    parseInt(row.n4, 10),
    parseInt(row.n5, 10),
  ].sort((a, b) => a - b)
  return { date, whites, bonus: parseInt(row.bonus, 10), game, era: tagEra(game, date) }
}

// Update these to match the actual field names found in Task 3 Step 2
const BONUS_FIELD: Record<Game, string> = {
  powerball: 'powerball',
  megamillions: 'mega_ball',
}

export function parseApiRow(game: Game, row: Record<string, string>): Draw {
  const date = parseDrawDate(row.draw_date)
  const whites = row.winning_numbers.trim().split(/\s+/).map(Number).sort((a, b) => a - b)
  const bonus = parseInt(row[BONUS_FIELD[game]], 10)
  return { date, whites, bonus, game, era: tagEra(game, date) }
}

export function parseCsv(game: Game, csvText: string): Draw[] {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  })
  return result.data.map(row => parseCsvRow(game, row))
}

export function mergeAndDedup(a: Draw[], b: Draw[]): Draw[] {
  const seen = new Map<string, Draw>()
  for (const draw of [...a, ...b]) {
    seen.set(draw.date, draw)
  }
  return Array.from(seen.values()).sort((x, y) => x.date.localeCompare(y.date))
}
```

- [ ] **Step 4: Run tests — update BONUS_FIELD if needed**

```bash
npx vitest run src/lib/parse.test.ts
```

If the `parseApiRow` powerball test fails because the bonus field name is wrong, update `BONUS_FIELD.powerball` in `parse.ts` to the name you found in Task 3 Step 2 and also update the test mock accordingly.

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/parse.ts src/lib/parse.test.ts
git commit -m "feat: parse library — CSV, API, era tagging, merge/dedup"
```

---

## Task 5: Cache library

**Files:**
- Create: `src/lib/cache.ts`
- Create: `src/lib/cache.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/cache.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run to verify tests fail**

```bash
npx vitest run src/lib/cache.test.ts
```

Expected: FAIL — "Cannot find module './cache'"

- [ ] **Step 3: Implement src/lib/cache.ts**

```typescript
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
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/lib/cache.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cache.ts src/lib/cache.test.ts
git commit -m "feat: localStorage cache with 24-hour TTL"
```

---

## Task 6: Analysis engine

**Files:**
- Create: `src/lib/analysis.ts`
- Create: `src/lib/analysis.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/analysis.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { scoreNumbers, generatePick, topPairs, analyseGame } from './analysis'
import type { Draw } from './types'

function makeDraws(
  count: number,
  whites: number[][],
  bonuses: number[],
): Draw[] {
  return Array.from({ length: count }, (_, i) => ({
    date: `2020-${String(Math.floor(i / 30) + 1).padStart(2, '0')}-${String((i % 30) + 1).padStart(2, '0')}`,
    whites: whites[i] ?? [1, 2, 3, 4, 5],
    bonus: bonuses[i] ?? 1,
    game: 'powerball' as const,
    era: 'current' as const,
  }))
}

describe('scoreNumbers', () => {
  it('returns one score per number in the pool', () => {
    const draws = makeDraws(10, Array(10).fill([1, 2, 3, 4, 5]), Array(10).fill(1))
    expect(scoreNumbers(draws, 1, 69)).toHaveLength(69)
  })

  it('gives higher combined score to a more frequent number', () => {
    const draws = [
      ...makeDraws(5, Array(5).fill([1, 2, 3, 4, 5]), Array(5).fill(1)),
      ...makeDraws(2, Array(2).fill([6, 7, 8, 9, 10]), Array(2).fill(2)),
    ]
    const scores = scoreNumbers(draws, 1, 69)
    const s1 = scores.find(s => s.number === 1)!
    const s6 = scores.find(s => s.number === 6)!
    expect(s1.combined).toBeGreaterThan(s6.combined)
  })

  it('all combined scores are between 0 and 1 inclusive', () => {
    const draws = makeDraws(20, Array(20).fill([3, 15, 27, 42, 60]), Array(20).fill(5))
    for (const s of scoreNumbers(draws, 1, 69)) {
      expect(s.combined).toBeGreaterThanOrEqual(0)
      expect(s.combined).toBeLessThanOrEqual(1)
    }
  })

  it('the most frequent number has freqScore of 1.0', () => {
    const draws = [
      ...makeDraws(5, Array(5).fill([1, 2, 3, 4, 5]), Array(5).fill(1)),
      ...makeDraws(2, Array(2).fill([6, 7, 8, 9, 10]), Array(2).fill(2)),
    ]
    const scores = scoreNumbers(draws, 1, 69)
    const maxFreq = Math.max(...scores.map(s => s.freqScore))
    expect(maxFreq).toBe(1)
  })
})

describe('generatePick', () => {
  it('returns exactly 5 white balls sorted ascending and 1 bonus', () => {
    const draws = makeDraws(20, Array(20).fill([3, 15, 27, 42, 60]), Array(20).fill(5))
    const whiteScores = scoreNumbers(draws, 1, 69)
    const bonusDraws = draws.map(d => ({ ...d, whites: [d.bonus] }))
    const bonusScores = scoreNumbers(bonusDraws, 1, 26)
    const pick = generatePick(whiteScores, bonusScores)
    expect(pick.whites).toHaveLength(5)
    expect(pick.whites).toEqual([...pick.whites].sort((a, b) => a - b))
    expect(pick.bonus).toBeGreaterThanOrEqual(1)
    expect(pick.bonus).toBeLessThanOrEqual(26)
    expect(pick.confidence).toBeGreaterThanOrEqual(0)
    expect(pick.confidence).toBeLessThanOrEqual(100)
  })
})

describe('topPairs', () => {
  it('finds the most co-occurring pair', () => {
    // Pair (1,2) appears in all 5 draws + 2 extra draws = 7 times; all others max 5
    const draws = [
      ...makeDraws(5, Array(5).fill([1, 2, 30, 40, 50]), Array(5).fill(1)),
      ...makeDraws(2, Array(2).fill([1, 2, 60, 65, 67]), Array(2).fill(1)),
    ]
    const pairs = topPairs(draws, 3)
    expect(pairs[0].a).toBe(1)
    expect(pairs[0].b).toBe(2)
    expect(pairs[0].count).toBe(7)
  })
})

describe('analyseGame', () => {
  it('returns correct pool sizes for powerball', () => {
    const draws = makeDraws(30, Array(30).fill([3, 15, 27, 42, 60]), Array(30).fill(5))
    const result = analyseGame(draws, 'powerball')
    expect(result.whiteScores).toHaveLength(69)
    expect(result.bonusScores).toHaveLength(26)
    expect(result.pick.whites).toHaveLength(5)
    expect(result.bonusPick.bonus).toBeGreaterThanOrEqual(1)
    expect(result.bonusPick.bonus).toBeLessThanOrEqual(26)
  })

  it('returns correct pool sizes for megamillions', () => {
    const draws = makeDraws(30, Array(30).fill([3, 15, 27, 42, 60]), Array(30).fill(5)).map(
      d => ({ ...d, game: 'megamillions' as const }),
    )
    const result = analyseGame(draws, 'megamillions')
    expect(result.whiteScores).toHaveLength(70)
    expect(result.bonusScores).toHaveLength(25)
  })
})
```

- [ ] **Step 2: Run to verify tests fail**

```bash
npx vitest run src/lib/analysis.test.ts
```

Expected: FAIL — "Cannot find module './analysis'"

- [ ] **Step 3: Implement src/lib/analysis.ts**

```typescript
import { GAME_CONFIG, RECENCY_WINDOW } from './types'
import type { AnalysisResult, BonusPick, Draw, Game, NumberScore, Pick } from './types'

function maxNormalize(values: number[]): number[] {
  const max = Math.max(...values)
  if (max === 0) return values.map(() => 0)
  return values.map(v => v / max)
}

// Scores each number in minNum..maxNum using draws where the number
// appears in d.whites. Call with bonus draws remapped to whites: [d.bonus].
export function scoreNumbers(draws: Draw[], minNum: number, maxNum: number): NumberScore[] {
  const pool = Array.from({ length: maxNum - minNum + 1 }, (_, i) => i + minNum)
  const total = draws.length
  const recent = draws.slice(-RECENCY_WINDOW)

  const rawFreq = pool.map(n => draws.filter(d => d.whites.includes(n)).length)
  const rawRecent = pool.map(n => recent.filter(d => d.whites.includes(n)).length)
  const normFreq = maxNormalize(rawFreq)
  const normRecent = maxNormalize(rawRecent)

  return pool.map((n, i) => {
    const appearances = rawFreq[i]
    const avgGap = appearances > 0 ? total / appearances : total
    const lastIdx = [...draws].reverse().findIndex(d => d.whites.includes(n))
    const lastSeenDrawsAgo = lastIdx === -1 ? total : lastIdx
    const gapScore = Math.min(lastSeenDrawsAgo / avgGap, 2.0) / 2.0
    const freqScore = normFreq[i]
    const recencyScore = normRecent[i]
    const combined = 0.35 * freqScore + 0.35 * recencyScore + 0.30 * gapScore
    return { number: n, freqScore, recencyScore, gapScore, combined, appearances, lastSeenDrawsAgo, avgGap }
  })
}

export function generatePick(whiteScores: NumberScore[], bonusScores: NumberScore[]): Pick {
  const topWhites = [...whiteScores].sort((a, b) => b.combined - a.combined).slice(0, 5)
  const whites = topWhites.map(s => s.number).sort((a, b) => a - b)
  const bonusScore = [...bonusScores].sort((a, b) => b.combined - a.combined)[0]
  const bonus = bonusScore.number
  const allSelected = [...topWhites, bonusScore]
  const confidence = Math.round(
    allSelected.reduce((sum, s) => sum + s.combined, 0) / allSelected.length * 100,
  )
  return { whites, bonus, confidence }
}

export function topPairs(draws: Draw[], n: number): Array<{ a: number; b: number; count: number }> {
  const counts = new Map<string, { a: number; b: number; count: number }>()
  for (const draw of draws) {
    const ws = draw.whites
    for (let i = 0; i < ws.length - 1; i++) {
      for (let j = i + 1; j < ws.length; j++) {
        const key = `${ws[i]}-${ws[j]}`
        const entry = counts.get(key) ?? { a: ws[i], b: ws[j], count: 0 }
        entry.count++
        counts.set(key, entry)
      }
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, n)
}

export function analyseGame(currentEraDraws: Draw[], game: Game): AnalysisResult {
  const { whiteMax, bonusMax } = GAME_CONFIG[game]
  const bonusDraws = currentEraDraws.map(d => ({ ...d, whites: [d.bonus] }))

  const whiteScores = scoreNumbers(currentEraDraws, 1, whiteMax.current)
  const bonusScores = scoreNumbers(bonusDraws, 1, bonusMax.current)

  const pick = generatePick(whiteScores, bonusScores)
  const topBonusScore = bonusScores.find(s => s.number === pick.bonus)!
  const bonusPick: BonusPick = {
    bonus: pick.bonus,
    confidence: Math.round(topBonusScore.combined * 100),
    score: topBonusScore,
  }

  return {
    whiteScores: [...whiteScores].sort((a, b) => b.combined - a.combined),
    bonusScores: [...bonusScores].sort((a, b) => b.combined - a.combined),
    topPairs: topPairs(currentEraDraws, 5),
    pick,
    bonusPick,
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/lib/analysis.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/analysis.ts src/lib/analysis.test.ts
git commit -m "feat: three-signal analysis engine with pick generation"
```

---

## Task 7: LoadingScreen and ErrorCard

**Files:**
- Create: `src/components/LoadingScreen.tsx`
- Create: `src/components/ErrorCard.tsx`
- Create: `src/components/LoadingScreen.test.tsx`
- Create: `src/components/ErrorCard.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/LoadingScreen.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import LoadingScreen from './LoadingScreen'

describe('LoadingScreen', () => {
  it('renders the message prop', () => {
    render(<LoadingScreen message="Fetching draws…" />)
    expect(screen.getByText('Fetching draws…')).toBeInTheDocument()
  })
})
```

Create `src/components/ErrorCard.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import ErrorCard from './ErrorCard'

describe('ErrorCard', () => {
  it('renders the error message', () => {
    render(<ErrorCard message="Network error" onRetry={() => {}} />)
    expect(screen.getByText('Network error')).toBeInTheDocument()
  })

  it('calls onRetry when Retry is clicked', async () => {
    const onRetry = vi.fn()
    render(<ErrorCard message="Error" onRetry={onRetry} />)
    await userEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('shows stale data warning when stale prop is true', () => {
    render(<ErrorCard message="Error" onRetry={() => {}} stale />)
    expect(screen.getByText(/cached data/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify tests fail**

```bash
npx vitest run src/components/LoadingScreen.test.tsx src/components/ErrorCard.test.tsx
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Implement LoadingScreen.tsx**

```typescript
interface Props {
  message: string
}

export default function LoadingScreen({ message }: Props) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <div className="text-4xl">🎱</div>
      <p className="text-sm text-gray-400">{message}</p>
      <div className="flex gap-2">
        <div className="h-1.5 w-20 rounded-full bg-red-600" />
        <div className="h-1.5 w-14 rounded-full bg-orange-500 opacity-50" />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Implement ErrorCard.tsx**

```typescript
interface Props {
  message: string
  onRetry: () => void
  stale?: boolean
}

export default function ErrorCard({ message, onRetry, stale = false }: Props) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      {stale && (
        <div className="rounded-md border border-yellow-600 bg-yellow-900/30 px-4 py-2 text-sm text-yellow-400">
          Showing cached data — unable to fetch latest draws
        </div>
      )}
      <div className="rounded-xl border border-red-800 bg-[#16213e] p-6 text-center">
        <p className="mb-4 text-gray-300">{message}</p>
        <button
          onClick={onRetry}
          className="rounded-full bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-500"
        >
          Retry
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run src/components/LoadingScreen.test.tsx src/components/ErrorCard.test.tsx
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/LoadingScreen.tsx src/components/LoadingScreen.test.tsx src/components/ErrorCard.tsx src/components/ErrorCard.test.tsx
git commit -m "feat: LoadingScreen and ErrorCard components"
```

---

## Task 8: Header and ModeToggle

**Files:**
- Create: `src/components/Header.tsx`
- Create: `src/components/ModeToggle.tsx`
- Create: `src/components/Header.test.tsx`
- Create: `src/components/ModeToggle.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/Header.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import Header from './Header'

describe('Header', () => {
  it('renders the app name', () => {
    render(<Header activeGame="powerball" onGameChange={() => {}} dataStatus="Cached · 1,847 draws" />)
    expect(screen.getByText('LottoPulse')).toBeInTheDocument()
  })

  it('renders dataStatus text', () => {
    render(<Header activeGame="powerball" onGameChange={() => {}} dataStatus="Fetching…" />)
    expect(screen.getByText('Fetching…')).toBeInTheDocument()
  })

  it('calls onGameChange with megamillions when that tab is clicked', async () => {
    const onGameChange = vi.fn()
    render(<Header activeGame="powerball" onGameChange={onGameChange} dataStatus="" />)
    await userEvent.click(screen.getByRole('button', { name: /mega millions/i }))
    expect(onGameChange).toHaveBeenCalledWith('megamillions')
  })
})
```

Create `src/components/ModeToggle.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import ModeToggle from './ModeToggle'

describe('ModeToggle', () => {
  it('renders Full Pick and Powerball Only buttons for powerball', () => {
    render(<ModeToggle mode="full" game="powerball" onModeChange={() => {}} />)
    expect(screen.getByRole('button', { name: /full pick/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /powerball only/i })).toBeInTheDocument()
  })

  it('shows Mega Ball Only label for megamillions', () => {
    render(<ModeToggle mode="full" game="megamillions" onModeChange={() => {}} />)
    expect(screen.getByRole('button', { name: /mega ball only/i })).toBeInTheDocument()
  })

  it('calls onModeChange with bonus when bonus button is clicked', async () => {
    const onModeChange = vi.fn()
    render(<ModeToggle mode="full" game="powerball" onModeChange={onModeChange} />)
    await userEvent.click(screen.getByRole('button', { name: /powerball only/i }))
    expect(onModeChange).toHaveBeenCalledWith('bonus')
  })
})
```

- [ ] **Step 2: Run to verify tests fail**

```bash
npx vitest run src/components/Header.test.tsx src/components/ModeToggle.test.tsx
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Implement Header.tsx**

```typescript
import { GAME_CONFIG } from '../lib/types'
import type { Game } from '../lib/types'

interface Props {
  activeGame: Game
  onGameChange: (game: Game) => void
  dataStatus: string
}

export default function Header({ activeGame, onGameChange, dataStatus }: Props) {
  return (
    <header className="flex items-center justify-between bg-[#1a1a2e] px-6 py-3">
      <span className="text-lg font-bold">🎱 LottoPulse</span>
      <div className="flex gap-2">
        {(['powerball', 'megamillions'] as Game[]).map(game => (
          <button
            key={game}
            onClick={() => onGameChange(game)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              activeGame === game
                ? `${GAME_CONFIG[game].tabColor} text-white`
                : 'border border-gray-600 text-gray-400 hover:border-gray-400'
            }`}
          >
            {GAME_CONFIG[game].label}
          </button>
        ))}
      </div>
      <span className="text-xs text-gray-500">{dataStatus}</span>
    </header>
  )
}
```

- [ ] **Step 4: Implement ModeToggle.tsx**

```typescript
import { GAME_CONFIG } from '../lib/types'
import type { Game, Mode } from '../lib/types'

interface Props {
  mode: Mode
  game: Game
  onModeChange: (mode: Mode) => void
}

export default function ModeToggle({ mode, game, onModeChange }: Props) {
  const bonusLabel = `${GAME_CONFIG[game].bonusLabel} Only`
  return (
    <div className="flex items-center gap-3 px-6 py-3">
      <span className="text-xs uppercase tracking-widest text-gray-500">Mode:</span>
      <div className="flex rounded-full border border-gray-700 bg-[#16213e] p-0.5">
        {(['full', 'bonus'] as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            className={`rounded-full px-4 py-1 text-sm font-semibold transition-colors ${
              mode === m ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {m === 'full' ? 'Full Pick' : bonusLabel}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run src/components/Header.test.tsx src/components/ModeToggle.test.tsx
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/Header.tsx src/components/Header.test.tsx src/components/ModeToggle.tsx src/components/ModeToggle.test.tsx
git commit -m "feat: Header and ModeToggle components"
```

---

## Task 9: SuggestedPick component

**Files:**
- Create: `src/components/SuggestedPick.tsx`
- Create: `src/components/SuggestedPick.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/SuggestedPick.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import SuggestedPick from './SuggestedPick'
import type { AnalysisResult } from '../lib/types'

function makeScore(number: number) {
  return { number, freqScore: 0.8, recencyScore: 0.9, gapScore: 0.7, combined: 0.8, appearances: 46, lastSeenDrawsAgo: 2, avgGap: 9.1 }
}

const mockResult: AnalysisResult = {
  whiteScores: [],
  bonusScores: [],
  topPairs: [],
  pick: { whites: [7, 14, 29, 41, 62], bonus: 18, confidence: 74 },
  bonusPick: { bonus: 18, confidence: 81, score: makeScore(18) },
}

describe('SuggestedPick — full mode', () => {
  it('renders all 5 white ball numbers', () => {
    render(<SuggestedPick mode="full" game="powerball" result={mockResult} />)
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('62')).toBeInTheDocument()
  })

  it('renders the confidence score', () => {
    render(<SuggestedPick mode="full" game="powerball" result={mockResult} />)
    expect(screen.getByText(/74%/)).toBeInTheDocument()
  })
})

describe('SuggestedPick — bonus mode', () => {
  it('renders lastSeenDrawsAgo in bonus mode', () => {
    render(<SuggestedPick mode="bonus" game="powerball" result={mockResult} />)
    expect(screen.getByText(/2 draws ago/i)).toBeInTheDocument()
  })

  it('renders bonus confidence score', () => {
    render(<SuggestedPick mode="bonus" game="powerball" result={mockResult} />)
    expect(screen.getByText(/81%/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify tests fail**

```bash
npx vitest run src/components/SuggestedPick.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement SuggestedPick.tsx**

```typescript
import { GAME_CONFIG } from '../lib/types'
import type { AnalysisResult, Game, Mode } from '../lib/types'

interface Props {
  mode: Mode
  game: Game
  result: AnalysisResult
}

function Ball({ number, className }: { number: number; className: string }) {
  return (
    <div className={`flex items-center justify-center rounded-full text-lg font-extrabold ${className}`}>
      {number}
    </div>
  )
}

export default function SuggestedPick({ mode, game, result }: Props) {
  const config = GAME_CONFIG[game]

  if (mode === 'full') {
    const { pick } = result
    return (
      <div className="rounded-xl border border-red-800 bg-[#16213e] p-5">
        <p className="mb-3 text-xs uppercase tracking-widest text-red-500">✨ Suggested Pick</p>
        <div className="flex flex-wrap items-center gap-3">
          {pick.whites.map(n => (
            <Ball key={n} number={n} className="h-12 w-12 bg-white text-[#1a1a2e]" />
          ))}
          <div className="mx-1 h-0.5 w-3 bg-gray-600" />
          <Ball number={pick.bonus} className={`h-12 w-12 ${config.bonusColor} text-white`} />
          <span className="text-xs text-gray-500">{config.bonusLabel}</span>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Confidence: <span className="font-semibold text-green-400">{pick.confidence}%</span>
          {' '}— frequency + recency + pattern analysis
        </p>
      </div>
    )
  }

  const { bonusPick } = result
  const s = bonusPick.score
  return (
    <div className="rounded-xl border border-red-800 bg-[#16213e] p-5">
      <p className="mb-3 text-xs uppercase tracking-widest text-red-500">
        🔴 Suggested {config.bonusLabel}
      </p>
      <div className="flex items-center gap-6">
        <Ball number={bonusPick.bonus} className={`h-16 w-16 text-2xl ${config.bonusColor} text-white`} />
        <div className="space-y-1 text-sm text-gray-400">
          <p>Pool: 1–{config.bonusMax.current} · <span className="font-semibold text-white">{s.appearances} appearances</span></p>
          <p>All-time frequency: <span className="font-semibold text-green-400">{(s.freqScore * 100).toFixed(1)}%</span></p>
          <p>Recent (104 draws): <span className="font-semibold text-orange-400">{(s.recencyScore * 100).toFixed(1)}%</span></p>
          <p>Last seen: <span className="font-semibold text-green-400">{s.lastSeenDrawsAgo} draws ago</span> · avg gap: {s.avgGap.toFixed(1)}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-gray-500">
        Confidence: <span className="font-semibold text-green-400">{bonusPick.confidence}%</span>
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/components/SuggestedPick.test.tsx
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/SuggestedPick.tsx src/components/SuggestedPick.test.tsx
git commit -m "feat: SuggestedPick component for full and bonus-only modes"
```

---

## Task 10: AnalysisPanels component

**Files:**
- Create: `src/components/AnalysisPanels.tsx`
- Create: `src/components/AnalysisPanels.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/AnalysisPanels.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import AnalysisPanels from './AnalysisPanels'
import type { AnalysisResult } from '../lib/types'

function makeScore(number: number, combined: number) {
  return { number, freqScore: combined, recencyScore: combined, gapScore: combined, combined, appearances: Math.round(combined * 100), lastSeenDrawsAgo: 3, avgGap: 9 }
}

const mockResult: AnalysisResult = {
  whiteScores: Array.from({ length: 69 }, (_, i) => makeScore(i + 1, (69 - i) / 69)),
  bonusScores: Array.from({ length: 26 }, (_, i) => makeScore(i + 1, (26 - i) / 26)),
  topPairs: [{ a: 1, b: 2, count: 38 }, { a: 3, b: 5, count: 31 }],
  pick: { whites: [1, 2, 3, 4, 5], bonus: 1, confidence: 74 },
  bonusPick: { bonus: 1, confidence: 81, score: makeScore(1, 0.81) },
}

describe('AnalysisPanels', () => {
  it('renders the Frequency panel heading', () => {
    render(<AnalysisPanels result={mockResult} />)
    expect(screen.getByText(/frequency/i)).toBeInTheDocument()
  })

  it('renders the Hot & Cold panel heading', () => {
    render(<AnalysisPanels result={mockResult} />)
    expect(screen.getByText(/hot.*cold/i)).toBeInTheDocument()
  })

  it('renders the Patterns panel heading', () => {
    render(<AnalysisPanels result={mockResult} />)
    expect(screen.getByText(/patterns/i)).toBeInTheDocument()
  })

  it('renders the top pair', () => {
    render(<AnalysisPanels result={mockResult} />)
    expect(screen.getByText(/1 \+ 2/)).toBeInTheDocument()
    expect(screen.getByText(/38×/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify tests fail**

```bash
npx vitest run src/components/AnalysisPanels.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement AnalysisPanels.tsx**

```typescript
import type { AnalysisResult, NumberScore } from '../lib/types'

interface Props {
  result: AnalysisResult
}

function HBar({ score, maxAppearances }: { score: NumberScore; maxAppearances: number }) {
  const pct = maxAppearances > 0 ? (score.appearances / maxAppearances) * 100 : 0
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-6 text-right text-gray-300">{score.number}</span>
      <div className="flex-1 rounded-full bg-gray-800">
        <div className="h-2 rounded-full bg-green-400" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-right text-xs text-green-400">{score.appearances}×</span>
    </div>
  )
}

export default function AnalysisPanels({ result }: Props) {
  const top10 = result.whiteScores.slice(0, 10)
  const maxAppearances = top10[0]?.appearances ?? 1
  const hot = result.whiteScores.slice(0, 5)
  const cold = [...result.whiteScores].sort((a, b) => a.recencyScore - b.recencyScore).slice(0, 5)

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* Frequency */}
      <div className="rounded-xl border border-gray-800 bg-[#16213e] p-4">
        <p className="mb-3 text-xs uppercase tracking-widest text-green-400">📊 Frequency</p>
        <div className="space-y-2">
          {top10.map(s => <HBar key={s.number} score={s} maxAppearances={maxAppearances} />)}
        </div>
      </div>

      {/* Hot & Cold */}
      <div className="rounded-xl border border-gray-800 bg-[#16213e] p-4">
        <p className="mb-3 text-xs uppercase tracking-widest text-orange-400">🔥 Hot &amp; Cold</p>
        <p className="mb-2 text-xs text-gray-500">Last 104 draws</p>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {hot.map(s => (
            <div key={s.number} className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
              {s.number}
            </div>
          ))}
        </div>
        <p className="mb-2 text-xs text-blue-400">❄️ Cold (overdue)</p>
        <div className="flex flex-wrap gap-1.5">
          {cold.map(s => (
            <div key={s.number} className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-900 text-xs font-bold text-blue-400">
              {s.number}
            </div>
          ))}
        </div>
      </div>

      {/* Patterns */}
      <div className="rounded-xl border border-gray-800 bg-[#16213e] p-4">
        <p className="mb-3 text-xs uppercase tracking-widest text-purple-400">🔗 Patterns</p>
        <p className="mb-2 text-xs text-gray-500">Common pairs</p>
        <div className="mb-3 space-y-1">
          {result.topPairs.map(p => (
            <div key={`${p.a}-${p.b}`} className="text-sm">
              {p.a} + {p.b} <span className="text-green-400">{p.count}×</span>
            </div>
          ))}
        </div>
        <p className="mb-2 text-xs text-gray-500">Gap (draws since last seen)</p>
        <div className="space-y-1">
          {result.whiteScores.slice(0, 4).map(s => (
            <div key={s.number} className="text-sm">
              {s.number} →{' '}
              <span className={s.lastSeenDrawsAgo > s.avgGap ? 'text-blue-400' : 'text-orange-400'}>
                {s.lastSeenDrawsAgo} draws ago
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/components/AnalysisPanels.test.tsx
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/AnalysisPanels.tsx src/components/AnalysisPanels.test.tsx
git commit -m "feat: AnalysisPanels — frequency, hot/cold, and patterns"
```

---

## Task 11: BonusBallChart component

**Files:**
- Create: `src/components/BonusBallChart.tsx`
- Create: `src/components/BonusBallChart.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/BonusBallChart.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import BonusBallChart from './BonusBallChart'
import type { NumberScore } from '../lib/types'

function makeScore(number: number): NumberScore {
  return { number, freqScore: 0.5, recencyScore: 0.5, gapScore: 0.5, combined: 0.5, appearances: 20, lastSeenDrawsAgo: 5, avgGap: 10 }
}

const scores26 = Array.from({ length: 26 }, (_, i) => makeScore(i + 1))

describe('BonusBallChart', () => {
  it('renders one bar per number in the pool', () => {
    const { container } = render(<BonusBallChart bonusScores={scores26} suggestedNumber={18} />)
    expect(container.querySelectorAll('[data-ball]')).toHaveLength(26)
  })

  it('applies ring highlight to the suggested number bar', () => {
    render(<BonusBallChart bonusScores={scores26} suggestedNumber={18} />)
    expect(screen.getByTestId('ball-18')).toHaveClass('ring-2')
  })
})
```

- [ ] **Step 2: Run to verify tests fail**

```bash
npx vitest run src/components/BonusBallChart.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement BonusBallChart.tsx**

```typescript
import type { NumberScore } from '../lib/types'

interface Props {
  bonusScores: NumberScore[]
  suggestedNumber: number
}

export default function BonusBallChart({ bonusScores, suggestedNumber }: Props) {
  const sorted = [...bonusScores].sort((a, b) => a.number - b.number)
  const maxApp = Math.max(...sorted.map(s => s.appearances), 1)

  return (
    <div className="rounded-xl border border-gray-800 bg-[#16213e] p-4">
      <p className="mb-3 text-xs uppercase tracking-widest text-red-500">📊 Full Bonus Ball Frequency</p>
      <div className="flex items-end gap-1" style={{ height: '80px' }}>
        {sorted.map(s => {
          const heightPct = (s.appearances / maxApp) * 100
          const isSelected = s.number === suggestedNumber
          return (
            <div
              key={s.number}
              data-ball={s.number}
              data-testid={`ball-${s.number}`}
              title={`${s.number}: ${s.appearances}×`}
              className={`flex-1 rounded-t-sm bg-red-600 transition-opacity ${
                isSelected ? 'ring-2 ring-white opacity-100' : 'opacity-50 hover:opacity-80'
              }`}
              style={{ height: `${Math.max(heightPct, 4)}%` }}
            />
          )
        })}
      </div>
      <div className="mt-1 flex justify-between text-xs text-gray-600">
        <span>1</span>
        <span className="font-semibold text-red-500">{suggestedNumber} ★</span>
        <span>{sorted[sorted.length - 1]?.number}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/components/BonusBallChart.test.tsx
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/BonusBallChart.tsx src/components/BonusBallChart.test.tsx
git commit -m "feat: BonusBallChart component"
```

---

## Task 12: App.tsx — data fetching and full wiring

**Files:**
- Modify: `src/components/App.tsx`
- Create: `src/components/App.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/App.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import App from './App'

// Minimal valid API rows — update field names to match Task 3 Step 2 findings
const pbRow = { draw_date: '2024-01-03T00:00:00.000', winning_numbers: '06 18 26 46 54', powerball: '12', multiplier: '2' }
const mmRow = { draw_date: '2024-01-02T00:00:00.000', winning_numbers: '05 14 32 41 62', mega_ball: '9', multiplier: '3' }

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    const data = String(url).includes('d6yy') ? Array(60).fill(pbRow) : Array(60).fill(mmRow)
    return Promise.resolve({ ok: true, json: () => Promise.resolve(data) })
  }))
})

describe('App', () => {
  it('shows a loading screen initially', () => {
    render(<App />)
    expect(screen.getByText(/fetching/i)).toBeInTheDocument()
  })

  it('renders the suggested pick after data loads', async () => {
    render(<App />)
    await waitFor(() => expect(screen.getByText(/suggested pick/i)).toBeInTheDocument(), { timeout: 5000 })
  })

  it('switches to Mega Millions and shows Mega Ball Only toggle', async () => {
    render(<App />)
    await waitFor(() => screen.getByText(/suggested pick/i), { timeout: 5000 })
    await userEvent.click(screen.getByRole('button', { name: /mega millions/i }))
    expect(screen.getByRole('button', { name: /mega ball only/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify tests fail**

```bash
npx vitest run src/components/App.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement App.tsx**

```typescript
import { useEffect, useState } from 'react'
import { analyseGame } from '../lib/analysis'
import { isCacheValid, loadFromCache, saveToCache } from '../lib/cache'
import { mergeAndDedup, parseApiRow, parseCsv } from '../lib/parse'
import type { AnalysisResult, CachedAppData, Game, GameData, Mode } from '../lib/types'
import { GAME_CONFIG } from '../lib/types'
import AnalysisPanels from './AnalysisPanels'
import BonusBallChart from './BonusBallChart'
import ErrorCard from './ErrorCard'
import Header from './Header'
import LoadingScreen from './LoadingScreen'
import ModeToggle from './ModeToggle'
import SuggestedPick from './SuggestedPick'

import pbCsv from '../data/powerball-1992-2009.csv?raw'
import mmCsv from '../data/megamillions-1996-2001.csv?raw'

const API_URLS: Record<Game, string> = {
  powerball: 'https://data.ny.gov/resource/d6yy-54nr.json?$limit=5000',
  megamillions: 'https://data.ny.gov/resource/5xaw-6ayf.json?$limit=5000',
}

async function fetchGameData(game: Game, historicalCsv: string): Promise<GameData> {
  const csvDraws = parseCsv(game, historicalCsv)
  const res = await fetch(API_URLS[game])
  if (!res.ok) throw new Error(`Failed to fetch ${game}: ${res.status}`)
  const rows: Record<string, string>[] = await res.json()
  const apiDraws = rows.map(row => parseApiRow(game, row))
  const draws = mergeAndDedup(csvDraws, apiDraws)
  const currentEraDraws = draws.filter(d => d.era === 'current')
  return { game, draws, currentEraDraws, fetchedAt: Date.now() }
}

type AppState =
  | { status: 'loading'; message: string }
  | { status: 'error'; message: string; staleData: CachedAppData | null }
  | { status: 'ready'; data: CachedAppData }

export default function App() {
  const [state, setState] = useState<AppState>({ status: 'loading', message: 'Fetching draw history…' })
  const [activeGame, setActiveGame] = useState<Game>('powerball')
  const [mode, setMode] = useState<Mode>('full')

  async function loadData() {
    setState({ status: 'loading', message: 'Fetching draw history…' })
    const cached = loadFromCache()
    if (cached && isCacheValid(cached)) {
      setState({ status: 'ready', data: cached })
      return
    }
    try {
      const [powerball, megamillions] = await Promise.all([
        fetchGameData('powerball', pbCsv),
        fetchGameData('megamillions', mmCsv),
      ])
      const appData: CachedAppData = { powerball, megamillions, cachedAt: Date.now() }
      saveToCache(appData)
      setState({ status: 'ready', data: appData })
    } catch {
      setState({
        status: 'error',
        message: cached
          ? 'Could not fetch latest draws — showing cached data.'
          : 'Could not load lottery data. Check your connection and try again.',
        staleData: cached,
      })
    }
  }

  useEffect(() => { loadData() }, [])

  if (state.status === 'loading') return <LoadingScreen message={state.message} />
  if (state.status === 'error' && !state.staleData) {
    return <ErrorCard message={state.message} onRetry={loadData} />
  }

  const data = state.status === 'ready' ? state.data : state.staleData!
  const gameData = data[activeGame]
  const result: AnalysisResult = analyseGame(gameData.currentEraDraws, activeGame)
  const dataStatus = `Cached · ${gameData.draws.length.toLocaleString()} draws`

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white">
      {state.status === 'error' && (
        <div className="border-b border-yellow-700 bg-yellow-900/30 px-6 py-2 text-xs text-yellow-400">
          Showing cached data — unable to fetch latest draws.{' '}
          <button className="underline" onClick={loadData}>Retry</button>
        </div>
      )}
      <Header activeGame={activeGame} onGameChange={g => { setActiveGame(g); setMode('full') }} dataStatus={dataStatus} />
      <ModeToggle mode={mode} game={activeGame} onModeChange={setMode} />
      <main className="mx-auto max-w-5xl space-y-4 p-6">
        <SuggestedPick mode={mode} game={activeGame} result={result} />
        {mode === 'full'
          ? <AnalysisPanels result={result} />
          : <BonusBallChart bonusScores={result.bonusScores} suggestedNumber={result.bonusPick.bonus} />
        }
        <p className="text-center text-xs text-gray-600">
          Data: NY Open Data API · {GAME_CONFIG[activeGame].label} · {gameData.draws.length.toLocaleString()} total draws
        </p>
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Run App tests**

```bash
npx vitest run src/components/App.test.tsx
```

Expected: all PASS.

- [ ] **Step 5: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests PASS across all files.

- [ ] **Step 6: Start dev server and manually verify**

```bash
npm run dev
```

Open http://localhost:5173 and confirm:
- Loading screen appears briefly on first visit
- Powerball tab: 5 white balls + red Powerball shown in suggested pick
- Three analysis panels render with real data
- Switching mode to "Powerball Only": single large ball + bar chart appear
- Switching to Mega Millions tab: yellow Mega Ball shown, toggle label changes to "Mega Ball Only"
- Refreshing the page uses the localStorage cache (loading is instant)

Stop with Ctrl+C.

- [ ] **Step 7: Commit**

```bash
git add src/components/App.tsx src/components/App.test.tsx
git commit -m "feat: App root — data fetching, caching, and full UI wiring"
```

---

## Task 13: Production build and deploy config

**Files:**
- Create: `public/_redirects`

- [ ] **Step 1: Add Netlify SPA redirect rule**

Create `public/_redirects`:

```
/*  /index.html  200
```

- [ ] **Step 2: Build for production**

```bash
npm run build
```

Expected: `dist/` directory created, no TypeScript or build errors. Output shows JS and CSS chunk sizes.

- [ ] **Step 3: Preview the production build**

```bash
npm run preview
```

Open http://localhost:4173. Verify the app loads and all features work identically to the dev server. Stop with Ctrl+C.

- [ ] **Step 4: Run the full test suite**

```bash
npx vitest run
```

Expected: all PASS, zero failures.

- [ ] **Step 5: Final commit**

```bash
git add public/_redirects
git commit -m "chore: Netlify redirect rule and production build verified"
```

---

## Implementation Notes

**Before starting Task 4 — verify the Powerball API field name:**
Run `curl -s "https://data.ny.gov/resource/d6yy-54nr.json?\$limit=2" | python3 -m json.tool` and check whether the Powerball bonus number is in a field called `powerball`, or whether it appears as the 6th number in `winning_numbers`.

If it's a 6th number in `winning_numbers`, update `parseApiRow` in `parse.ts`:
```typescript
const allNums = row.winning_numbers.trim().split(/\s+/).map(Number)
const whites = allNums.slice(0, 5).sort((a, b) => a - b)
const bonus = allNums[5]
```
And remove the `BONUS_FIELD` lookup for powerball. Update the test mock in `parse.test.ts` and `App.test.tsx` accordingly.

**Historical CSV sourcing (Task 3):**
If official lottery sites don't offer bulk exports, search GitHub for "powerball historical results csv" or "mega millions historical results csv" — several public repositories maintain these datasets. Verify number ranges match the pre-2015 Powerball pools (white 1–59, bonus 1–35) and pre-2017 Mega Millions pools (white 1–75, bonus 1–15) before committing.
