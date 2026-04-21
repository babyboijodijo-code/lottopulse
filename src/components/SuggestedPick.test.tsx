import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SuggestedPick from './SuggestedPick'
import type { AnalysisResult, NumberScore } from '../lib/types'

const mockScore: NumberScore = {
  number: 15, freqScore: 0.8, recencyScore: 0.7, gapScore: 0.6, combined: 0.72,
  appearances: 50, lastSeenDrawsAgo: 3, avgGap: 5,
}

const mockResult: AnalysisResult = {
  whiteScores: [],
  bonusScores: [],
  topPairs: [],
  pick: { whites: [5, 14, 22, 36, 51], bonus: 12, confidence: 63 },
  bonusPick: { bonus: 15, confidence: 72, score: mockScore },
}

describe('SuggestedPick full mode', () => {
  it('renders all 5 white balls', () => {
    render(<SuggestedPick game="powerball" mode="full" result={mockResult} />)
    for (const n of [5, 14, 22, 36, 51]) {
      expect(screen.getByText(String(n))).toBeInTheDocument()
    }
  })

  it('renders bonus ball', () => {
    render(<SuggestedPick game="powerball" mode="full" result={mockResult} />)
    expect(screen.getByText('12')).toBeInTheDocument()
  })

  it('shows confidence percentage', () => {
    render(<SuggestedPick game="powerball" mode="full" result={mockResult} />)
    expect(screen.getByText(/confidence 63%/i)).toBeInTheDocument()
  })
})

describe('SuggestedPick bonus mode', () => {
  it('shows only bonus ball', () => {
    render(<SuggestedPick game="powerball" mode="bonus" result={mockResult} />)
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.queryByText('5')).not.toBeInTheDocument()
  })

  it('shows Powerball Pick heading for powerball', () => {
    render(<SuggestedPick game="powerball" mode="bonus" result={mockResult} />)
    expect(screen.getByText(/powerball pick/i)).toBeInTheDocument()
  })

  it('shows Mega Ball Pick heading for megamillions', () => {
    render(<SuggestedPick game="megamillions" mode="bonus" result={mockResult} />)
    expect(screen.getByText(/mega ball pick/i)).toBeInTheDocument()
  })
})
