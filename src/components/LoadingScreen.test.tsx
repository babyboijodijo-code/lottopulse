import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoadingScreen from './LoadingScreen'

describe('LoadingScreen', () => {
  it('renders loading text', () => {
    render(<LoadingScreen />)
    expect(screen.getByText(/fetching draw history/i)).toBeInTheDocument()
  })
})
