import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { render, screen, act } from '@testing-library/react'
import { BingoReactionOverlay } from './BingoReactionOverlay'
import { BingoMatchCoordinator, BingoReaction } from '../state/BingoMatchCoordinator'

describe('BingoReactionOverlay', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders incoming reactions and automatically cleans them up', () => {
    let reactionHandler: ((reaction: BingoReaction) => void) | null = null

    const mockCoordinator = {
      onReaction: vi.fn().mockImplementation((handler) => {
        reactionHandler = handler
        return vi.fn()
      }),
    } as unknown as BingoMatchCoordinator

    render(<BingoReactionOverlay coordinator={mockCoordinator} />)
    expect(mockCoordinator.onReaction).toHaveBeenCalled()

    // Simulate receiving an opponent reaction
    act(() => {
      reactionHandler?.({
        id: 'test_rx_1',
        emoji: '🔥',
        senderId: 'player2',
        senderName: 'GuestBob',
        isLocal: false,
        timestamp: 1000,
      })
    })

    expect(screen.getByText('🔥')).toBeDefined()
    expect(screen.getByText('GuestBob')).toBeDefined()

    // Advance time beyond animation duration
    act(() => {
      vi.advanceTimersByTime(2500)
    })

    expect(screen.queryByText('🔥')).toBeNull()
  })
})
