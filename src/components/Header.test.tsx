import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Header from './Header'

describe('Header', () => {
  it('renders both game tabs', () => {
    render(<Header activeGame="powerball" onGameChange={() => {}} />)
    expect(screen.getByRole('button', { name: /powerball/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /mega millions/i })).toBeInTheDocument()
  })

  it('calls onGameChange with megamillions when tab clicked', () => {
    const onChange = vi.fn()
    render(<Header activeGame="powerball" onGameChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /mega millions/i }))
    expect(onChange).toHaveBeenCalledWith('megamillions')
  })
})
