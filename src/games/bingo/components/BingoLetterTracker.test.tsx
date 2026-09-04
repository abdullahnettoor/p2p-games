import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { BingoLetterTracker } from './BingoLetterTracker'

describe('BingoLetterTracker Component', () => {
  it('renders all 5 letters B-I-N-G-O', () => {
    render(<BingoLetterTracker completedLines={0} />)
    const letters = ['B', 'I', 'N', 'G', 'O']
    letters.forEach((l) => {
      expect(screen.getByText(l)).toBeInTheDocument()
    })
  })

  it('highlights letters corresponding to completed lines count', () => {
    const { container } = render(<BingoLetterTracker completedLines={3} />)
    // 3 lines completed: B, I, N active
    const activeElements = container.querySelectorAll('[data-active="true"]')
    expect(activeElements.length).toBe(3)
  })
})
