import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ErrorCard from './ErrorCard'

describe('ErrorCard', () => {
  it('renders the error message', () => {
    render(<ErrorCard message="Network timeout" onRetry={() => {}} />)
    expect(screen.getByText('Network timeout')).toBeInTheDocument()
  })

  it('calls onRetry when button is clicked', () => {
    const onRetry = vi.fn()
    render(<ErrorCard message="err" onRetry={onRetry} />)
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
