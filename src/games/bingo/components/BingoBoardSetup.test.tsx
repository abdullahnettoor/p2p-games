import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { BingoBoardSetup } from './BingoBoardSetup'

describe('BingoBoardSetup Component', () => {
  it('renders empty slots and available number palette', () => {
    render(<BingoBoardSetup onBoardComplete={() => {}} />)
    expect(screen.getByText(/Set Up Your Board/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Randomize/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Clear/i })).toBeInTheDocument()
  })

  it('populates board with 25 numbers when clicking Randomize', () => {
    const handleComplete = vi.fn()
    render(<BingoBoardSetup onBoardComplete={handleComplete} />)

    const randomizeBtn = screen.getByRole('button', { name: /Randomize/i })
    fireEvent.click(randomizeBtn)

    // The ready/submit button should now be enabled and trigger callback
    const confirmBtn = screen.getByRole('button', { name: /Confirm Board/i })
    expect(confirmBtn).not.toBeDisabled()
    fireEvent.click(confirmBtn)
    expect(handleComplete).toHaveBeenCalledTimes(1)
    expect(handleComplete.mock.calls[0][0]).toHaveLength(25)
  })
})
