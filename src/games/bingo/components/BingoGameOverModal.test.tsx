import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BingoGameOverModal } from './BingoGameOverModal'

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
