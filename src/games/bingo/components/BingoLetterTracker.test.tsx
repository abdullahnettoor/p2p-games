import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BingoLetterTracker } from './BingoLetterTracker'

describe('BingoLetterTracker Component', () => {
  it('renders all 5 letters B-I-N-G-O', () => {
    render(<BingoLetterTracker completedLines={0} />)
    const letters = ['B', 'I', 'N', 'G', 'O']
    letters.forEach((letter) => {
      expect(screen.getByText(letter)).toBeInTheDocument()
    })
  })

  it('stamps multiple newly completed letters in sequence without replaying restored progress', async () => {
    const { container, rerender } = render(
      <BingoLetterTracker completedLines={2} ownerRole="guest" />
    )

    expect(container.querySelectorAll('[data-new-stamp="true"]')).toHaveLength(0)

    rerender(<BingoLetterTracker completedLines={4} ownerRole="guest" />)

    await waitFor(() => {
      expect(container.querySelectorAll('[data-new-stamp="true"]')).toHaveLength(2)
    })
    const newStamps = container.querySelectorAll('[data-new-stamp="true"]')
    expect(newStamps[0]).toHaveAttribute('data-ink', 'guest')
    expect(newStamps[0]).toHaveStyle({ animationDelay: '0ms' })
    expect(newStamps[1]).toHaveStyle({ animationDelay: '110ms' })
  })

  it('highlights letters corresponding to completed lines count', () => {
    const { container } = render(<BingoLetterTracker completedLines={3} />)
    expect(container.querySelectorAll('[data-active="true"]')).toHaveLength(3)
  })
})
