import { GAME_CONFIG, RECENCY_WINDOW } from './types'
import type { Draw, Game, NumberScore, AnalysisResult, Pick, BonusPick } from './types'

export function scoreNumbers(draws: Draw[], poolSize: number): NumberScore[] {
  const n = draws.length

  // Count appearances for each number
  const appearances = new Map<number, number>()
  for (let i = 1; i <= poolSize; i++) appearances.set(i, 0)
  for (const d of draws) {
    for (const w of d.whites) {
      if (w >= 1 && w <= poolSize) appearances.set(w, (appearances.get(w) ?? 0) + 1)
    }
  }

  // Recency: appearances in last RECENCY_WINDOW draws
  const recencyStart = Math.max(0, n - RECENCY_WINDOW)
  const recentDraws = draws.slice(recencyStart)
  const recentAppearances = new Map<number, number>()
  for (let i = 1; i <= poolSize; i++) recentAppearances.set(i, 0)
  for (const d of recentDraws) {
    for (const w of d.whites) {
      if (w >= 1 && w <= poolSize) recentAppearances.set(w, (recentAppearances.get(w) ?? 0) + 1)
    }
  }

  // Gap: draws since last seen, avg gap between appearances
  const lastSeen = new Map<number, number>() // index of most recent draw containing this number
  const gaps = new Map<number, number[]>()
  for (let i = 1; i <= poolSize; i++) gaps.set(i, [])

  for (let i = 0; i < n; i++) {
    for (const w of draws[i].whites) {
      if (w < 1 || w > poolSize) continue
      if (lastSeen.has(w)) gaps.get(w)!.push(i - lastSeen.get(w)!)
      lastSeen.set(w, i)
    }
  }

  const maxFreq = Math.max(...Array.from(appearances.values()))
  const maxRecency = Math.max(...Array.from(recentAppearances.values()))

  const scores: NumberScore[] = []
  for (let num = 1; num <= poolSize; num++) {
    const app = appearances.get(num)!
    const rec = recentAppearances.get(num)!
    const numGaps = gaps.get(num)!
    const avgGap = numGaps.length > 0 ? numGaps.reduce((a, b) => a + b, 0) / numGaps.length : n
    const drawsSinceLast = lastSeen.has(num) ? n - 1 - lastSeen.get(num)! : n
    // Gap score: how overdue relative to average gap, capped at 2×
    const rawGap = avgGap > 0 ? Math.min(drawsSinceLast / avgGap, 2) / 2 : 0

    const freqScore = maxFreq > 0 ? app / maxFreq : 0
    const recencyScore = maxRecency > 0 ? rec / maxRecency : 0
    const gapScore = rawGap

    const combined = 0.35 * freqScore + 0.35 * recencyScore + 0.30 * gapScore

    scores.push({
      number: num,
      freqScore,
      recencyScore,
      gapScore,
      combined,
      appearances: app,
      lastSeenDrawsAgo: drawsSinceLast,
      avgGap,
    })
  }

  return scores.sort((a, b) => b.combined - a.combined)
}

function buildTopPairs(draws: Draw[], topNums: Set<number>): Array<{ a: number; b: number; count: number }> {
  const pairCounts = new Map<string, { a: number; b: number; count: number }>()
  for (const d of draws) {
    const nums = d.whites.filter(w => topNums.has(w)).sort((a, b) => a - b)
    for (let i = 0; i < nums.length; i++) {
      for (let j = i + 1; j < nums.length; j++) {
        const key = `${nums[i]}-${nums[j]}`
        if (!pairCounts.has(key)) pairCounts.set(key, { a: nums[i], b: nums[j], count: 0 })
        pairCounts.get(key)!.count++
      }
    }
  }
  return Array.from(pairCounts.values()).sort((a, b) => b.count - a.count).slice(0, 20)
}

export function analyze(draws: Draw[], game: Game): AnalysisResult {
  const cfg = GAME_CONFIG[game]
  const whitePool = cfg.whiteMax.current
  const bonusPool = cfg.bonusMax.current

  // Score white balls
  const whiteScores = scoreNumbers(draws, whitePool)

  // Score bonus balls — remap draws so whites = [bonus]
  const bonusDraws = draws.map(d => ({ ...d, whites: [d.bonus] }))
  const bonusScores = scoreNumbers(bonusDraws, bonusPool)

  // Pick: top 5 white scores (unique), no white/bonus conflict check needed
  const topWhites = whiteScores.slice(0, 5).map(s => s.number).sort((a, b) => a - b)
  const topBonus = bonusScores[0]

  const avgWhiteConf = whiteScores.slice(0, 5).reduce((s, n) => s + n.combined, 0) / 5
  const confidence = Math.round(avgWhiteConf * 100)

  const pick: Pick = { whites: topWhites, bonus: topBonus.number, confidence }
  const bonusPick: BonusPick = { bonus: topBonus.number, confidence: Math.round(topBonus.combined * 100), score: topBonus }

  const topNumSet = new Set(whiteScores.slice(0, 20).map(s => s.number))
  const topPairs = buildTopPairs(draws, topNumSet)

  return { whiteScores, bonusScores, topPairs, pick, bonusPick }
}
