import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import BingoPage from './page'

const navigation = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  replace: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => navigation.searchParams,
  useRouter: () => ({ replace: navigation.replace }),
}))

vi.mock('@/games/bingo/components/BingoOnlineGame', () => ({
  BingoOnlineGame: ({
    initialAction,
    initialRoomCode,
    onExit,
  }: {
    initialAction?: string | null
    initialRoomCode?: string | null
    onExit: () => void
  }) => (
    <div>
      <span>{`Online BINGO: action=${initialAction ?? 'none'}:room=${initialRoomCode ?? 'none'}`}</span>
      <button type="button" onClick={onExit}>Exit game</button>
    </div>
  ),
}))

describe('BingoPage', () => {
  beforeEach(() => {
    navigation.searchParams = new URLSearchParams()
    navigation.replace.mockClear()
  })

  it('renders default online game without action or room code on /bingo', () => {
    render(<BingoPage />)

    expect(screen.getByText('Online BINGO: action=none:room=none')).toBeInTheDocument()
  })

  it('passes action=create when opening /bingo?action=create', () => {
    navigation.searchParams = new URLSearchParams('action=create')
    render(<BingoPage />)

    expect(screen.getByText('Online BINGO: action=create:room=none')).toBeInTheDocument()
  })

  it('passes room code when opening /bingo?room=friend-123', () => {
    navigation.searchParams = new URLSearchParams('room=friend-123')
    render(<BingoPage />)

    expect(screen.getByText('Online BINGO: action=none:room=friend-123')).toBeInTheDocument()
  })

  it('passes room code when opening legacy /bingo?match=friend-123', () => {
    navigation.searchParams = new URLSearchParams('match=friend-123')
    render(<BingoPage />)

    expect(screen.getByText('Online BINGO: action=none:room=friend-123')).toBeInTheDocument()
  })

  it('returns to the Catalog when the game exits', () => {
    render(<BingoPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Exit game' }))

    expect(navigation.replace).toHaveBeenCalledWith('/')
  })
})
