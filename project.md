# LottoPulse

A static React web app that fetches the full Powerball and Mega Millions draw history, runs a three-signal statistical analysis, and suggests the most probable numbers for the next draw.

## What it does

- Pulls every draw on record from the NY Open Data API (Powerball from 2010, Mega Millions from 2002)
- Merges with bundled historical CSVs to cover the pre-API gap
- Scores every number across three signals: **frequency**, **recency**, and **gap** (how overdue a number is relative to its own average)
- Outputs a ranked pick for both white balls and the bonus ball
- Caches results in localStorage for 24 hours so repeat visits are instant

## Modes

| Mode | Description |
|------|-------------|
| Full Pick | Suggests 5 white balls + bonus ball |
| Bonus Only | Analyses just the Powerball or Mega Ball in isolation |

## Analysis engine

Each number in the pool is scored independently using three max-normalized signals (0–1):

| Signal | Weight | Description |
|--------|--------|-------------|
| Frequency | 35% | Appearances across all current-era draws |
| Recency | 35% | Appearances in the last 104 draws (~1 year) |
| Gap | 30% | How overdue the number is vs. its own average gap |

Combined score: `0.35 × freq + 0.35 × recency + 0.30 × gap`

White balls and bonus balls are scored separately. Only **current-era draws** are used — both games changed their number pools mid-history, so legacy draws are excluded from pick generation.

## Era boundaries

| Game | Current era start | White balls | Bonus ball |
|------|-------------------|-------------|------------|
| Powerball | 2015-10-07 | 1–69 | 1–26 |
| Mega Millions | 2017-10-28 | 1–70 | 1–25 |

## Stack

- React 18 + Vite + TypeScript
- Tailwind CSS v4
- Papa Parse (CSV parsing)
- Vitest + React Testing Library
- No backend — deployed as a static site

## Running locally

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npx vitest run     # run all tests
npx tsc --noEmit   # type-check
npm run build      # production build → dist/
```

## Deploying

Configured for Netlify out of the box. Connect the repo on [netlify.com](https://netlify.com) and it will build and deploy automatically using `netlify.toml`.

## Data source

[NY Open Data](https://data.ny.gov) — no API key required.

- Powerball: `data.ny.gov/resource/d6yy-54nr`
- Mega Millions: `data.ny.gov/resource/5xaw-6ayf`
