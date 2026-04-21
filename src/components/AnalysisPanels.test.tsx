import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import AnalysisPanels from './AnalysisPanels'
import type { AnalysisResult, NumberScore } from '../lib/types'

function makeScore(n: number): NumberScore {
  return { number: n, freqScore: 0.5, recencyScore: 0.4, gapScore: 0.3, combined: 0.41, appearances: 10, lastSeenDrawsAgo: 2, avgGap: 4 }
}

const mockResult: AnalysisResult = {
  whiteScores: Array.from({ length: 69 }, (_, i) => makeScore(i + 1)),
  bonusScores: Array.from({ length: 26 }, (_, i) => makeScore(i + 1)),
  topPairs: [{ a: 1, b: 2, count: 15 }, { a: 3, b: 5, count: 12 }],
  pick: { whites: [1, 2, 3, 4, 5], bonus: 10, confidence: 55 },
  bonusPick: { bonus: 1, confidence: 41, score: makeScore(1) },
}

describe('AnalysisPanels', () => {
  it('shows White Ball Scores panel in full mode', () => {
    render(<AnalysisPanels game="powerball" mode="full" result={mockResult} />)
    expect(screen.getByText(/white ball scores/i)).toBeInTheDocument()
  })

  it('shows bonus scores panel in full mode', () => {
    render(<AnalysisPanels game="powerball" mode="full" result={mockResult} />)
    expect(screen.getByText(/powerball scores/i)).toBeInTheDocument()
  })

  it('shows pairs panel in full mode', () => {
    render(<AnalysisPanels game="powerball" mode="full" result={mockResult} />)
    expect(screen.getByText(/top co-occurring pairs/i)).toBeInTheDocument()
  })

  it('hides white ball panel in bonus mode', () => {
    render(<AnalysisPanels game="powerball" mode="bonus" result={mockResult} />)
    expect(screen.queryByText(/white ball scores/i)).not.toBeInTheDocument()
  })

  it('uses Mega Ball label for megamillions', () => {
    render(<AnalysisPanels game="megamillions" mode="full" result={mockResult} />)
    expect(screen.getByText(/mega ball scores/i)).toBeInTheDocument()
  })
})
