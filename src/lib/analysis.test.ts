import { describe, it, expect } from 'vitest'
import { scoreNumbers, analyze } from './analysis'
import type { Draw } from './types'

function makeDraws(count: number, whites: number[], bonus: number, baseDate = '2020-01-01'): Draw[] {
  return Array.from({ length: count }, (_, i) => ({
    date: `2020-${String(Math.floor(i / 30) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
    whites,
    bonus,
    game: 'powerball' as const,
    era: 'current' as const,
  }))
}

describe('scoreNumbers', () => {
  it('returns one score per number in the pool', () => {
    const draws: Draw[] = [
      { date: '2020-01-01', whites: [1, 2, 3, 4, 5], bonus: 10, game: 'powerball', era: 'current' },
    ]
    const scores = scoreNumbers(draws, 5)
    expect(scores).toHaveLength(5)
    expect(scores.map(s => s.number).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5])
  })

  it('scores all numbers 1 through poolSize', () => {
    const draws: Draw[] = [
      { date: '2020-01-01', whites: [1, 2, 3, 4, 5], bonus: 10, game: 'powerball', era: 'current' },
    ]
    const scores = scoreNumbers(draws, 10)
    expect(scores).toHaveLength(10)
    const nums = scores.map(s => s.number).sort((a, b) => a - b)
    expect(nums[0]).toBe(1)
    expect(nums[9]).toBe(10)
  })

  it('most frequent number has freqScore of 1.0', () => {
    const draws: Draw[] = [
      { date: '2020-01-01', whites: [1, 2, 3, 4, 5], bonus: 1, game: 'powerball', era: 'current' },
      { date: '2020-01-04', whites: [1, 6, 7, 8, 9], bonus: 2, game: 'powerball', era: 'current' },
    ]
    const scores = scoreNumbers(draws, 10)
    const top = scores.find(s => s.number === 1)!
    expect(top.freqScore).toBe(1)
    expect(top.appearances).toBe(2)
  })

  it('number with zero appearances has freqScore 0', () => {
    const draws: Draw[] = [
      { date: '2020-01-01', whites: [1, 2, 3, 4, 5], bonus: 1, game: 'powerball', era: 'current' },
    ]
    const scores = scoreNumbers(draws, 10)
    const absent = scores.find(s => s.number === 10)!
    expect(absent.freqScore).toBe(0)
    expect(absent.appearances).toBe(0)
  })

  it('all combined scores are between 0 and 1', () => {
    const draws: Draw[] = Array.from({ length: 20 }, (_, i) => ({
      date: `2020-01-${String(i + 1).padStart(2, '0')}`,
      whites: [1, 2, 3, 4, 5],
      bonus: 1,
      game: 'powerball' as const,
      era: 'current' as const,
    }))
    const scores = scoreNumbers(draws, 20)
    for (const s of scores) {
      expect(s.combined).toBeGreaterThanOrEqual(0)
      expect(s.combined).toBeLessThanOrEqual(1)
    }
  })

  it('returns scores sorted by combined descending', () => {
    const draws: Draw[] = [
      { date: '2020-01-01', whites: [1, 2, 3, 4, 5], bonus: 1, game: 'powerball', era: 'current' },
      { date: '2020-01-04', whites: [1, 6, 7, 8, 9], bonus: 2, game: 'powerball', era: 'current' },
    ]
    const scores = scoreNumbers(draws, 10)
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i - 1].combined).toBeGreaterThanOrEqual(scores[i].combined)
    }
  })

  it('number absent for many draws gets higher gapScore', () => {
    // Number 1 appears only in draw 0 then disappears — should be overdue
    const draws: Draw[] = Array.from({ length: 30 }, (_, i) => ({
      date: `2020-${String(Math.floor(i / 28) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
      whites: i === 0 ? [1, 2, 3, 4, 5] : [2, 3, 4, 5, 6],
      bonus: 1,
      game: 'powerball' as const,
      era: 'current' as const,
    }))
    const s1 = scoreNumbers(draws, 10).find(s => s.number === 1)!
    const s2 = scoreNumbers(draws, 10).find(s => s.number === 2)!
    // 1 has been absent longer relative to its avg gap, so its gapScore should be higher
    expect(s1.gapScore).toBeGreaterThanOrEqual(s2.gapScore)
  })
})

describe('analyze', () => {
  const draws: Draw[] = Array.from({ length: 50 }, (_, i) => ({
    date: `2020-01-${String(i % 28 + 1).padStart(2, '0')}`,
    whites: [1, 2, 3, 4, 5],
    bonus: 10,
    game: 'powerball' as const,
    era: 'current' as const,
  }))

  it('returns 5 white scores in pick', () => {
    const result = analyze(draws, 'powerball')
    expect(result.pick.whites).toHaveLength(5)
  })

  it('pick whites are sorted ascending', () => {
    const result = analyze(draws, 'powerball')
    const w = result.pick.whites
    for (let i = 1; i < w.length; i++) {
      expect(w[i]).toBeGreaterThan(w[i - 1])
    }
  })

  it('pick whites are within valid powerball range (1-69)', () => {
    const result = analyze(draws, 'powerball')
    for (const n of result.pick.whites) {
      expect(n).toBeGreaterThanOrEqual(1)
      expect(n).toBeLessThanOrEqual(69)
    }
  })

  it('pick bonus is within valid powerball range (1-26)', () => {
    const result = analyze(draws, 'powerball')
    expect(result.pick.bonus).toBeGreaterThanOrEqual(1)
    expect(result.pick.bonus).toBeLessThanOrEqual(26)
  })

  it('bonusPick is within valid powerball bonus range (1-26)', () => {
    const result = analyze(draws, 'powerball')
    expect(result.bonusPick.bonus).toBeGreaterThanOrEqual(1)
    expect(result.bonusPick.bonus).toBeLessThanOrEqual(26)
  })

  it('confidence is between 0 and 100', () => {
    const result = analyze(draws, 'powerball')
    expect(result.pick.confidence).toBeGreaterThanOrEqual(0)
    expect(result.pick.confidence).toBeLessThanOrEqual(100)
  })

  it('whiteScores length equals current-era white pool size', () => {
    const result = analyze(draws, 'powerball')
    expect(result.whiteScores).toHaveLength(69)
  })

  it('topPairs lists pairs sorted by count descending', () => {
    const result = analyze(draws, 'powerball')
    for (let i = 1; i < result.topPairs.length; i++) {
      expect(result.topPairs[i - 1].count).toBeGreaterThanOrEqual(result.topPairs[i].count)
    }
  })

  it('works for megamillions with correct pool size', () => {
    const mmDraws: Draw[] = draws.map(d => ({ ...d, game: 'megamillions' as const }))
    const result = analyze(mmDraws, 'megamillions')
    expect(result.whiteScores).toHaveLength(70)
    expect(result.pick.bonus).toBeGreaterThanOrEqual(1)
    expect(result.pick.bonus).toBeLessThanOrEqual(25)
  })
})
