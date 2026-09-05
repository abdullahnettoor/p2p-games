import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BingoGameOverModal } from './BingoGameOverModal'
import { BingoBoard } from '../types'
import { BingoCall } from '../types'

const board: BingoBoard = Array.from({ length: 25 }, (_, index) => index + 1)
const calls: BingoCall[] = [
  { type: 'call', number: 1, playerId: 'p1', sequence: 1 },
]

describe('BingoGameOverModal', () => {
  const localPlayer = { id: 'p1', name: 'Alice', role: 'host' as const }
  const remotePlayer = { id: 'p2', name: 'Bob', role: 'guest' as const }

  it('renders victory by forfeit when opponent disconnects and fails to reconnect', () => {
    render(
      <BingoGameOverModal
        winResult={{ isGameOver: true, winnerId: 'p1', reason: 'forfeit' }}
        localPlayer={localPlayer}
        remotePlayer={remotePlayer}
        localCompletedLines={2}
        remoteCompletedLines={1}
        totalCalledCount={10}
        onExit={vi.fn()}
      />
    )

    expect(screen.getByText('VICTORY BY FORFEIT')).toBeDefined()
    expect(screen.getByText(/Bob disconnected and did not return within 30 seconds/)).toBeDefined()
  })

  it('explicitly presents a draw result', () => {
    render(
      <BingoGameOverModal
        winResult={{ isGameOver: true, winnerId: null, isDraw: true }}
        localPlayer={localPlayer}
        remotePlayer={remotePlayer}
        localCompletedLines={5}
        remoteCompletedLines={5}
        totalCalledCount={25}
        onExit={vi.fn()}
      />
    )

    expect(screen.getByText("IT'S A DRAW!")).toBeInTheDocument()
    expect(screen.getByText(/Both players completed 5 lines/)).toBeInTheDocument()
    expect(screen.getAllByText('DRAW')).toHaveLength(2)
  })

  it('explicitly explains a forfeit loss', () => {
    render(
      <BingoGameOverModal
        winResult={{ isGameOver: true, winnerId: 'p2', reason: 'forfeit' }}
        localPlayer={localPlayer}
        remotePlayer={remotePlayer}
        localCompletedLines={2}
        remoteCompletedLines={3}
        totalCalledCount={10}
        onExit={vi.fn()}
      />
    )

    expect(screen.getByText('DEFEAT BY FORFEIT')).toBeInTheDocument()
    expect(screen.getByText(/You forfeited the match/)).toBeInTheDocument()
  })

  it('keeps result context while optionally comparing annotated boards and notes', () => {
    render(
      <BingoGameOverModal
        winResult={{ isGameOver: true, winnerId: 'p1' }}
        localPlayer={localPlayer}
        remotePlayer={remotePlayer}
        localCompletedLines={5}
        remoteCompletedLines={3}
        totalCalledCount={15}
        localBoard={board}
        remoteBoard={[...board].reverse()}
        calls={calls}
        playersById={{
          p1: { name: 'Alice', role: 'host' },
          p2: { name: 'Bob', role: 'guest' },
        }}
        localLineDetails={{ count: 1, rows: [0], cols: [], diags: [] }}
        remoteLineDetails={{ count: 0, rows: [], cols: [], diags: [] }}
        history={calls}
        rematchState="received"
        onAcceptRematch={vi.fn()}
        onDeclineRematch={vi.fn()}
        onExit={vi.fn()}
      />
    )

    expect(screen.getByText('Bob has requested a rematch!')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Compare Boards' }))

    expect(screen.getByRole('heading', { name: 'BINGO' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Board comparison' })).toBeInTheDocument()
    expect(screen.getAllByRole('grid')).toHaveLength(2)

    fireEvent.click(screen.getByText('Match notes'))
    expect(screen.getByText('Alice called 1')).toBeVisible()
  })

  it('places focus in the dialog and closes on Escape with focus restoration', async () => {
    const onExit = vi.fn()
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()

    const { unmount } = render(
      <BingoGameOverModal
        winResult={{ isGameOver: true, winnerId: 'p1' }}
        localPlayer={localPlayer}
        remotePlayer={remotePlayer}
        localCompletedLines={5}
        remoteCompletedLines={3}
        totalCalledCount={15}
        onRequestRematch={vi.fn()}
        onExit={onExit}
      />
    )

    await waitFor(() => expect(screen.getByRole('button', { name: 'Request Rematch' })).toHaveFocus())
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onExit).toHaveBeenCalledTimes(1)
    unmount()
    expect(trigger).toHaveFocus()
    trigger.remove()
  })

  it('handles rematch requests and callbacks correctly', () => {
    const onRequestRematch = vi.fn()
    const { rerender } = render(
      <BingoGameOverModal
        winResult={{ isGameOver: true, winnerId: 'p1' }}
        localPlayer={localPlayer}
        remotePlayer={remotePlayer}
        localCompletedLines={5}
        remoteCompletedLines={3}
        totalCalledCount={15}
        rematchState="none"
        onRequestRematch={onRequestRematch}
        onExit={vi.fn()}
      />
    )

    const requestBtn = screen.getByText('Request Rematch')
    fireEvent.click(requestBtn)
    expect(onRequestRematch).toHaveBeenCalledTimes(1)

    // Rerender as 'requested'
    rerender(
      <BingoGameOverModal
        winResult={{ isGameOver: true, winnerId: 'p1' }}
        localPlayer={localPlayer}
        remotePlayer={remotePlayer}
        localCompletedLines={5}
        remoteCompletedLines={3}
        totalCalledCount={15}
        rematchState="requested"
        onRequestRematch={onRequestRematch}
        onExit={vi.fn()}
      />
    )
    expect(screen.getByText(/Rematch requested... Waiting for opponent/)).toBeDefined()

    // Rerender as 'received'
    const onAcceptRematch = vi.fn()
    const onDeclineRematch = vi.fn()
    rerender(
      <BingoGameOverModal
        winResult={{ isGameOver: true, winnerId: 'p1' }}
        localPlayer={localPlayer}
        remotePlayer={remotePlayer}
        localCompletedLines={5}
        remoteCompletedLines={3}
        totalCalledCount={15}
        rematchState="received"
        onAcceptRematch={onAcceptRematch}
        onDeclineRematch={onDeclineRematch}
        onExit={vi.fn()}
      />
    )
    expect(screen.getByText(/Bob has requested a rematch!/)).toBeDefined()
    fireEvent.click(screen.getByText('Accept Rematch'))
    expect(onAcceptRematch).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByText('Decline'))
    expect(onDeclineRematch).toHaveBeenCalledTimes(1)
  })
})
