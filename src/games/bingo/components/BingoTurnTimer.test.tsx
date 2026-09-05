import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BingoTurnTimer } from './BingoTurnTimer'

describe('BingoTurnTimer', () => {
  it.each([
    [11, 'normal'],
    [10, 'warning'],
    [4, 'warning'],
    [3, 'urgent'],
    [0, 'urgent'],
  ] as const)('labels %i seconds as %s urgency', (secondsRemaining, urgency) => {
    render(<BingoTurnTimer secondsRemaining={secondsRemaining} isMyTurn />)

    expect(screen.getByRole('timer')).toHaveAttribute('data-urgency', urgency)
    expect(screen.getByText(`${secondsRemaining}s`)).toBeInTheDocument()
  })
})
