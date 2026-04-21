# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**LottoPulse** — a static React web app that fetches full Powerball and Mega Millions draw history, runs a three-signal statistical analysis, and suggests the most probable numbers for the next draw.

Implementation plan: `docs/superpowers/plans/2026-04-20-lottopulse.md`  
Design spec: `docs/superpowers/specs/2026-04-20-lottopulse-design.md`

## Commands

```bash
npm run dev        # dev server at http://localhost:5173
npm run build      # production build → dist/
npm run preview    # preview production build at http://localhost:4173

npx vitest run                          # run all tests once
npx vitest run src/lib/analysis.test.ts # run a single test file
npx vitest                              # watch mode
npx tsc --noEmit                        # type-check without building
```

## Stack

React 18 + Vite + TypeScript + Tailwind CSS v4 + Vitest + React Testing Library + Papa Parse. No backend — deployed as a static site.

## Architecture

### Data flow

1. On first load, `App.tsx` fetches both games in parallel: bundled historical CSVs (`src/data/*.csv`) are parsed and merged with live NY Open Data API results via `lib/parse.ts`.
2. The merged dataset is written to `localStorage` with a 24-hour TTL (`lib/cache.ts`). Subsequent visits skip the network entirely.
3. `lib/analysis.ts` runs the scoring engine on `currentEraDraws` only (never all draws) and returns an `AnalysisResult` that all display components consume.

### Key domain rules

**Era boundaries** — both games changed their number pools mid-history. The app tags every draw record with its era and uses **current-era draws only** for pick generation:
- Powerball: `>= 2015-10-07` → white balls 1–69, bonus 1–26. Before: white 1–59, bonus 1–35.
- Mega Millions: `>= 2017-10-28` → white balls 1–70, Mega Ball 1–25. Before: white 1–75, Mega Ball 1–15.

**Bundled CSVs** cover the pre-API gap (Powerball 1992–2009, Mega Millions 1996–2001). The NY Open Data API covers the rest (Powerball from 2010, Mega Millions from 2002).

### Analysis engine (`src/lib/analysis.ts`)

White balls and bonus balls are scored **independently** using the same `scoreNumbers` function. For bonus ball scoring, draws are remapped so `whites: [d.bonus]` before being passed in — the function only reads `d.whites`.

Three signals, each normalized 0–1 using max-scaling:
- **Frequency** — appearances across current-era draws
- **Recency** — appearances in the last 104 draws (~1 year)
- **Gap** — how overdue the number is relative to its own average gap (capped at 2× avg)

Combined score: `0.35 × freq + 0.35 × recency + 0.30 × gap`

### Component state

All state lives in `App.tsx` — no external store. `activeGame` (powerball/megamillions) and `mode` (full/bonus) drive which analysis result is passed to child components. Switching game resets mode to `'full'`.

### CSV import

Bundled CSV files are imported with Vite's `?raw` suffix (`import pbCsv from '../data/powerball-1992-2009.csv?raw'`), which returns the file contents as a string at build time.
