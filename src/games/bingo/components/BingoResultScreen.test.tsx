import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BingoComparisonScreen, BingoResultScreen } from './BingoResultScreen'
import { BingoBoard, BingoCall } from '../types'

const board: BingoBoard = Array.from({ length: 25 }, (_, index) => index + 1)
const calls: BingoCall[] = [{ type: 'call', number: 1, playerId: 'p1', sequence: 1 }]
const baseProps = {
  winResult: { isGameOver: true, winnerId: 'p1' as string | null },
  localPlayer: { id: 'p1', name: 'Alice', role: 'host' as const },
  remotePlayer: { id: 'p2', name: 'Bob', role: 'guest' as const },
  localCompletedLines: 5,
  remoteCompletedLines: 3,
  totalCalledCount: 15,
  localBoard: board,
  remoteBoard: [...board].reverse(),
  calls,
  playersById: {
    p1: { name: 'Alice', role: 'host' as const },
    p2: { name: 'Bob', role: 'guest' as const },
  },
  localLineDetails: { count: 1, rows: [0], cols: [], diags: [] },
  remoteLineDetails: { count: 0, rows: [], cols: [], diags: [] },
  history: calls,
  rematchState: 'none' as const,
  onRequestRematch: vi.fn(),
  onAcceptRematch: vi.fn(),
  onDeclineRematch: vi.fn(),
  onExit: vi.fn(),
  isMuted: false,
  onToggleMute: vi.fn(),
}

describe('Bingo result screens', () => {
  it.each([
    [{ isGameOver: true, winnerId: 'p1', reason: 'forfeit' }, 'VICTORY BY FORFEIT'],
    [{ isGameOver: true, winnerId: 'p2', reason: 'forfeit' }, 'DEFEAT BY FORFEIT'],
    [{ isGameOver: true, winnerId: null, isDraw: true }, "IT'S A DRAW!"],
  ])('explicitly presents %s', (winResult, title) => {
    render(<BingoResultScreen {...baseProps} winResult={winResult} />)
    expect(screen.getByText(title)).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('navigates to a dedicated comparison screen while preserving a received rematch', async () => {
    const onCompareBoards = vi.fn()
    const { rerender } = render(
      <BingoResultScreen
        {...baseProps}
        rematchState="received"
        onCompareBoards={onCompareBoards}
      />
    )

    expect(screen.getByText('Bob has requested a rematch!')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Compare Boards' }))
    expect(onCompareBoards).toHaveBeenCalledTimes(1)

    rerender(
      <BingoComparisonScreen
        {...baseProps}
        rematchState="received"
        onBack={vi.fn()}
      />
    )
    expect(screen.getByRole('heading', { name: 'Compare Boards' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Accept Rematch' })).toHaveFocus())
    expect(screen.getAllByRole('grid')).toHaveLength(2)
    expect(screen.getByText('Bob has requested a rematch!')).toBeInTheDocument()
    expect(screen.getByText('Alice called 1')).toBeInTheDocument()
  })

  it('focuses the primary action, exits on Escape, and restores focus', async () => {
    const onExit = vi.fn()
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()

    const { unmount } = render(<BingoResultScreen {...baseProps} onExit={onExit} />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Request Rematch' })).toHaveFocus())
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onExit).toHaveBeenCalledTimes(1)
    unmount()
    expect(trigger).toHaveFocus()
    trigger.remove()
  })
})
