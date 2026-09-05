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
  BingoOnlineGame: ({ role, matchId, onExit }: { role: string; matchId?: string; onExit: () => void }) => (
    <div>
      <span>{`Online BINGO: ${role}:${matchId ?? 'new'}`}</span>
      <button type="button" onClick={onExit}>Exit game</button>
    </div>
  ),
}))

describe('BingoPage', () => {
  beforeEach(() => {
    navigation.searchParams = new URLSearchParams()
    navigation.replace.mockClear()
  })

  it('starts an online Host Match directly when opened from the Catalog', () => {
    render(<BingoPage />)

    expect(screen.getByText('Online BINGO: host:new')).toBeInTheDocument()
    expect(screen.queryByText(/Pass & Play/i)).not.toBeInTheDocument()
  })

  it('opens an invited Guest Match without showing mode selection', () => {
    navigation.searchParams = new URLSearchParams('match=friend-123')
    render(<BingoPage />)

    expect(screen.getByText('Online BINGO: guest:friend-123')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Create Online Match' })).not.toBeInTheDocument()
  })

  it('returns to the Catalog when the game exits', () => {
    render(<BingoPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Exit game' }))

    expect(navigation.replace).toHaveBeenCalledWith('/')
  })
})
