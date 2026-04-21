import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import BonusBallChart from './BonusBallChart'
import type { NumberScore } from '../lib/types'

function makeScore(n: number, appearances: number): NumberScore {
  return { number: n, freqScore: 0.5, recencyScore: 0.4, gapScore: 0.3, combined: 0.41, appearances, lastSeenDrawsAgo: 2, avgGap: 4 }
}

const scores = [makeScore(1, 30), makeScore(2, 15), makeScore(3, 5)]

describe('BonusBallChart', () => {
  it('renders the heading with bonus label', () => {
    render(<BonusBallChart game="powerball" scores={scores} />)
    expect(screen.getByText(/powerball frequency/i)).toBeInTheDocument()
  })

  it('renders a bar for each score', () => {
    render(<BonusBallChart game="powerball" scores={scores} />)
    // Each ball number appears as a label
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('uses Mega Ball label for megamillions', () => {
    render(<BonusBallChart game="megamillions" scores={scores} />)
    expect(screen.getByText(/mega ball frequency/i)).toBeInTheDocument()
  })
})
