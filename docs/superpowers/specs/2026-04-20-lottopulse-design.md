# LottoPulse — Design Spec
**Date:** 2026-04-20  
**Status:** Approved

---

## Overview

A static React web app that fetches the full draw history for Powerball and Mega Millions, runs a three-signal statistical analysis on every number, and suggests the most probable pick(s) for the next draw. Two analysis modes: full ticket (5 white balls + bonus ball) or bonus ball only.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | React + Vite |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Deployment | Static site — Netlify / Vercel / GitHub Pages |
| Backend | None |

---

## Data Sources

### Bundled historical CSVs (shipped with the app)
Two static files committed to the repo, sourced from public lottery archives before initial deployment:

- `src/data/powerball-1992-2009.csv` — Powerball draws from 1992 through end of 2009
- `src/data/megamillions-1996-2001.csv` — Mega Millions ("The Big Game") draws from 1996 through end of 2001

CSV columns: `draw_date, n1, n2, n3, n4, n5, bonus`

### NY Open Data API (fetched at runtime)
- Powerball (2010–present): `https://data.ny.gov/resource/d6yy-54nr.json`
- Mega Millions (2002–present): `https://data.ny.gov/resource/5xaw-6ayf.json`

Fetched with `$limit=10000` to retrieve all records in one request. No API key required. CORS-enabled.

### Merge & cache
On first load, the app:
1. Parses the bundled CSVs
2. Fetches both NY Open Data endpoints in parallel
3. Merges and deduplicates by draw date (date is the unique key)
4. Writes the merged dataset to `localStorage` with a 24-hour TTL

On subsequent visits within 24 hours, the app reads from `localStorage` directly — no network calls.

### Approximate dataset sizes
- Powerball: ~1,850 total draws; ~550 current-era draws (post-Oct 2015)
- Mega Millions: ~2,550 total draws

---

## Powerball 2015 Rule Change

On **7 October 2015**, Powerball changed its pools:
- White balls: 1–59 → 1–69
- Powerball (bonus): 1–35 → 1–26

Each draw record is tagged with its era: `pre-2015` or `current`.

**Pick generation uses current-era draws only** (post-Oct 2015), since pre-2015 numbers outside the current pool cannot be drawn today.

Frequency charts display all eras with a visual callout explaining the rule change, so users can see the full historical picture without being misled.

Mega Millions eras:
- **Pre-2017** (1996–Oct 2017): white balls 1–75, Mega Ball 1–15
- **Current** (Oct 2017–present): white balls 1–70, Mega Ball 1–25

Same era-tagging approach applies — pick generation uses current-era draws only (post-Oct 2017).

---

## Analysis Engine

### Scope
White balls and bonus balls are scored independently using the same three-signal engine. The valid number pool differs by game and era.

| Game | White ball pool | Bonus ball pool |
|---|---|---|
| Powerball (current) | 1–69 | 1–26 |
| Mega Millions (current) | 1–70 | 1–25 |

### Signal 1 — All-time frequency score
```
raw_freq(n)    = appearances(n, current_era_draws)
freq_score(n)  = raw_freq(n) / max(raw_freq, all n in pool)
```
Normalized 0–1: the most-drawn number in the pool scores 1.0; all others scale relative to it.

### Signal 2 — Recency score
```
raw_recent(n)     = appearances(n, last_104_draws)
recency_score(n)  = raw_recent(n) / max(raw_recent, all n in pool)
```
104 draws ≈ 1 year of twice-weekly draws. Normalized 0–1 using the same max-scaling approach.

### Signal 3 — Gap score
```
avg_gap(n)     = total_draws / appearances(n)
draws_since(n) = draws since n last appeared
gap_score(n)   = min(draws_since(n) / avg_gap(n), 2.0) / 2.0
```
Capped at 2× average gap to prevent outlier dominance. Normalized 0–1.

### Combined score
```
score(n) = (0.35 × freq_score) + (0.35 × recency_score) + (0.30 × gap_score)
```

### Pick generation
- **Full pick mode:** rank the white ball pool by `score`, select top 5 (sorted ascending for display) → rank the bonus ball pool by `score`, select top 1
- **Bonus ball only mode:** rank only the bonus ball pool by `score`, select top 1

### Confidence score
```
confidence = mean(score of selected numbers) × 100
```
Displayed as a percentage. Represents how strongly the signals agree — not a true probability of winning.

---

## UI Structure

### Layout
Dark-themed single-page app. No routing — all state managed in React.

### Header
- App name: **LottoPulse**
- Game tabs: `Powerball` | `Mega Millions`
- Data status: "Cached · N draws" or "Fetching…"

### Mode toggle (below header)
Pill toggle: `Full Pick` | `Powerball Only` (or `Mega Ball Only` on the MM tab)

Switching mode re-runs the analysis engine and updates all panels instantly — no network call needed.

### Suggested Pick card
- **Full pick mode:** 5 white lottery balls + 1 coloured bonus ball displayed as circles, sorted ascending. Confidence score below.
- **Bonus ball only mode:** Single large bonus ball + breakdown of all three signal scores + plain-English interpretation (e.g. "running hot", "overdue").

### Analysis panels (3 columns)
1. **Frequency** — top 10 numbers with horizontal bar chart, draw count label
2. **Hot & Cold** — top 5 hot numbers (orange balls) + top 5 cold/overdue numbers (blue balls), based on last 104 draws
3. **Patterns** — top 5 most co-occurring pairs + gap table (last seen vs average gap) for the top suggested numbers

### Bonus ball only — extra panel
When in bonus-ball-only mode, the three analysis panels collapse and are replaced by a single full-width bar chart showing the frequency of every number in the bonus ball pool (1–26 or 1–25), with the suggested number highlighted.

### Loading state
Full-screen spinner with progress text: "Fetching Powerball draws… Fetching Mega Millions draws… Merging…"

### Error state
If the API fetch fails and no cache exists: friendly error card with a "Retry" button. If cache exists but is stale, show cached data with a warning banner.

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| API fetch fails, no cache | Error card + Retry button |
| API fetch fails, stale cache | Show stale data + warning banner |
| CSV parse error | Console error, fall back to API-only data |
| localStorage unavailable | Skip caching, fetch fresh on every load |
| Number pool out of range in source data | Filter out invalid draws, log warning |

---

## File Structure

```
src/
  data/
    powerball-1992-2009.csv
    megamillions-1996-2001.csv
  lib/
    parse.ts          # CSV + API response parsing, era tagging, merge/dedup
    cache.ts          # localStorage read/write with TTL
    analysis.ts       # three-signal scoring engine, pick generation
  components/
    App.tsx
    Header.tsx
    ModeToggle.tsx
    SuggestedPick.tsx
    AnalysisPanels.tsx
    BonusBallChart.tsx
    LoadingScreen.tsx
    ErrorCard.tsx
  index.css
  main.tsx
```

---

## Out of Scope

- User accounts or saved picks
- Multiple pick set generation
- "Check my numbers" feature
- Push notifications for draw results
- Backend or server-side rendering
