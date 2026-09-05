import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BingoMatchNotes } from './BingoMatchNotes'

const players = {
  host: { name: 'Alice', role: 'host' as const },
  guest: { name: 'Bob', role: 'guest' as const },
}

describe('BingoMatchNotes', () => {
  it('keeps all Calls, Passes, and timeouts in sequence behind an expandable control', () => {
    render(
      <BingoMatchNotes
        history={[
          { type: 'call', number: 7, playerId: 'host', sequence: 1 },
          { type: 'pass', playerId: 'guest', reason: 'voluntary', sequence: 2 },
          { type: 'pass', playerId: 'host', reason: 'timeout', sequence: 3 },
          { type: 'call', number: 19, playerId: 'guest', sequence: 4 },
        ]}
        playersById={players}
      />
    )

    expect(screen.getByText('Match notes')).toBeInTheDocument()
    expect(screen.queryByText('Alice called 7')).not.toBeVisible()

    fireEvent.click(screen.getByText('Match notes'))

    expect(screen.getAllByRole('listitem')).toHaveLength(4)
    expect(screen.getByText('Alice called 7')).toBeVisible()
    expect(screen.getByText('Bob passed')).toBeVisible()
    expect(screen.getByText('Alice timed out')).toBeVisible()
    expect(screen.getByText('Bob called 19')).toBeVisible()
  })
})
