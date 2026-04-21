import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ModeToggle from './ModeToggle'

describe('ModeToggle', () => {
  it('renders Full Pick and bonus-only buttons', () => {
    render(<ModeToggle game="powerball" mode="full" onModeChange={() => {}} />)
    expect(screen.getByRole('button', { name: /full pick/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /powerball only/i })).toBeInTheDocument()
  })

  it('uses Mega Ball label for megamillions', () => {
    render(<ModeToggle game="megamillions" mode="full" onModeChange={() => {}} />)
    expect(screen.getByRole('button', { name: /mega ball only/i })).toBeInTheDocument()
  })

  it('calls onModeChange with bonus when bonus button clicked', () => {
    const onChange = vi.fn()
    render(<ModeToggle game="powerball" mode="full" onModeChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /powerball only/i }))
    expect(onChange).toHaveBeenCalledWith('bonus')
  })
})
